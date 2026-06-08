import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { ShieldCheck, Activity } from 'lucide-react';

export default function LiveFeed({ token }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Refs for models — the rAF loop reads these, never stale state
  const cocoModelRef = useRef(null);
  const maskModelRef = useRef(null);
  const isDetectingRef = useRef(false);
  const requestRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const accumulatedStatsRef = useRef({ masked: 0, unmasked: 0 });

  // State only for UI rendering
  const [modelsLoaded, setModelsLoaded] = useState({ coco: false, mask: false });
  const [detectionStats, setDetectionStats] = useState({ persons: 0, masked: 0, unmasked: 0 });

  // ──────────────────────────────────────────────
  // 1. Load both models on mount
  // ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      // COCO-SSD — person detector
      try {
        console.log('[SafeGuard] Loading COCO-SSD…');
        const coco = await cocoSsd.load();
        if (cancelled) return;
        cocoModelRef.current = coco;
        setModelsLoaded(prev => ({ ...prev, coco: true }));
        console.log('[SafeGuard] ✅ COCO-SSD ready');
      } catch (err) {
        console.error('[SafeGuard] ❌ COCO-SSD failed:', err);
      }

      // Custom mask classifier
      try {
        console.log('[SafeGuard] Loading Face Mask model…');
        const mask = await tf.loadGraphModel('/model/model.json');
        if (cancelled) return;
        maskModelRef.current = mask;
        setModelsLoaded(prev => ({ ...prev, mask: true }));
        console.log('[SafeGuard] ✅ Face Mask model ready');

        // Warm-up inference to eliminate first-frame jank
        const warmup = tf.zeros([1, 224, 224, 3]);
        const warmupResult = mask.predict(warmup);
        if (warmupResult instanceof tf.Tensor) {
          warmupResult.dispose();
        } else {
          Object.values(warmupResult).forEach(t => t.dispose());
        }
        warmup.dispose();
        console.log('[SafeGuard] ✅ Mask model warmed up');
      } catch (err) {
        console.error('[SafeGuard] ❌ Face Mask model failed:', err);
      }
    };

    loadModels();
    return () => { cancelled = true; };
  }, []);

  // ──────────────────────────────────────────────
  // 2. Core detection loop — pure rAF, ref-only
  // ──────────────────────────────────────────────
  const runDetection = useCallback(async () => {
    // ---- guard: still detecting? ----
    if (!isDetectingRef.current) return;

    const cocoModel = cocoModelRef.current;
    const maskModel = maskModelRef.current;

    // Models not ready yet — keep spinning
    if (!cocoModel || !maskModel) {
      requestRef.current = requestAnimationFrame(runDetection);
      return;
    }

    // Video element checks
    const webcam = webcamRef.current;
    if (!webcam || !webcam.video) {
      requestRef.current = requestAnimationFrame(runDetection);
      return;
    }
    const video = webcam.video;
    if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const vidW = video.videoWidth;   // intrinsic video width
    const vidH = video.videoHeight;  // intrinsic video height

    // ---- Canvas + coordinate mapping setup ----
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      requestRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const rect = container.getBoundingClientRect();
    const displayW = rect.width;
    const displayH = rect.height;

    // Sync canvas buffer size to its CSS pixel size (prevents blurry draws)
    const dw = Math.round(displayW);
    const dh = Math.round(displayH);
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
    }

    // ---- Compute the object-cover transform ----
    // The <Webcam> uses CSS object-cover, so the video is scaled up to
    // fully fill the container and then center-cropped.  We must replicate
    // this same transform to map coords → canvas coords.
    const videoAspect = vidW / vidH;
    const containerAspect = displayW / displayH;
    let scale, offsetX, offsetY;
    if (videoAspect > containerAspect) {
      // Video wider → crop left/right
      scale = displayH / vidH;
      offsetX = (displayW - vidW * scale) / 2;
      offsetY = 0;
    } else {
      // Video taller → crop top/bottom
      scale = displayW / vidW;
      offsetX = 0;
      offsetY = (displayH - vidH * scale) / 2;
    }

    // ---- Run COCO-SSD person detection ----
    let predictions = [];
    let frameTensor = null;
    try {
      frameTensor = tf.browser.fromPixels(video);
      predictions = await cocoModel.detect(frameTensor, 20, 0.4);
    } catch (err) {
      console.error('[SafeGuard] COCO-SSD error:', err);
    }

    // Bail if detection was stopped while we were awaiting
    if (!isDetectingRef.current) {
      if (frameTensor) frameTensor.dispose();
      return;
    }

    // Filter to person-class only
    const personDetections = predictions.filter(p => p.class === 'person');

    // Run mask classification in parallel for each detected person
    const results = await Promise.all(
      personDetections.map(async (detection) => {
        const [bx, by, bw, bh] = detection.bbox;

        // Adaptive face box estimation from person box (head is at the top)
        const aspect = bw / bh;
        let faceW, faceH, faceX, faceY;

        if (aspect > 0.65) {
          // Close-up: person box is mostly the head/shoulders
          faceW = bw * 0.85;
          faceH = bh * 0.75;
          faceX = bx + (bw - faceW) / 2;
          faceY = by + bh * 0.05;
        } else {
          // Medium/Far: upper portion of the person box
          faceW = bw * 0.65;
          faceH = bh * 0.25;
          faceX = bx + (bw - faceW) / 2;
          faceY = by + bh * 0.02;
        }

        // Ensure face box is within video boundaries
        const faceStartX = Math.max(0, Math.min(vidW - 1, faceX));
        const faceStartY = Math.max(0, Math.min(vidH - 1, faceY));
        const faceEndX = Math.max(0, Math.min(vidW, faceX + faceW));
        const faceEndY = Math.max(0, Math.min(vidH, faceY + faceH));
        const finalFaceW = faceEndX - faceStartX;
        const finalFaceH = faceEndY - faceStartY;

        let hasMask = false;
        let maskConfidence = 0;

        if (frameTensor && finalFaceW >= 10 && finalFaceH >= 10) {
          try {
            const maskData = tf.tidy(() => {
              const cropped = frameTensor.slice(
                [Math.round(faceStartY), Math.round(faceStartX), 0],
                [Math.round(finalFaceH), Math.round(finalFaceW), 3]
              );
              const resized = tf.image.resizeBilinear(cropped, [224, 224]);
              const normalized = resized.toFloat().sub(127.5).div(127.5).expandDims(0);
              const rawResult = maskModel.predict(normalized);
              return rawResult instanceof tf.Tensor
                ? rawResult
                : Object.values(rawResult)[0];
            });

            if (maskData) {
              const out = await maskData.data();
              maskData.dispose();
              hasMask = out[0] > out[1];
              maskConfidence = Math.max(out[0], out[1]);
            }
          } catch (err) {
            console.error('[SafeGuard] Mask inference error:', err.message);
          }
        }

        return {
          faceX,
          faceY,
          faceW,
          faceH,
          hasMask,
          maskConfidence
        };
      })
    );

    // Free the frame tensor
    if (frameTensor) frameTensor.dispose();

    // Bail if detection was stopped while we were classifying
    if (!isDetectingRef.current) return;

    const ctx = canvas.getContext('2d');

    // ---- Clear canvas right before drawing new results to prevent flickering ----
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let stats = { persons: personDetections.length, masked: 0, unmasked: 0 };
    let violationDetected = false;
    let highestConfidence = 0;

    // Draw the estimated face box for each person
    results.forEach((res) => {
      const { faceX, faceY, faceW, faceH, hasMask, maskConfidence } = res;

      // ---- Map video-pixel coords → CSS-display coords ----
      const dx = faceX * scale + offsetX;
      const dy = faceY * scale + offsetY;
      const dfw = faceW * scale;
      const dfh = faceH * scale;

      // ---- Draw bounding box ----
      const color   = hasMask ? '#22c55e' : '#ef4444';
      const bgColor = hasMask ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';

      // Translucent fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(dx, dy, dfw, dfh);

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(dx, dy, dfw, dfh);

      // Corner accents (modern look)
      const cLen = Math.min(18, dfw / 4, dfh / 4);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(dx, dy + cLen);             ctx.lineTo(dx, dy);             ctx.lineTo(dx + cLen, dy);             ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx + dfw - cLen, dy);       ctx.lineTo(dx + dfw, dy);       ctx.lineTo(dx + dfw, dy + cLen);       ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx, dy + dfh - cLen);       ctx.lineTo(dx, dy + dfh);       ctx.lineTo(dx + cLen, dy + dfh);       ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx + dfw - cLen, dy + dfh); ctx.lineTo(dx + dfw, dy + dfh); ctx.lineTo(dx + dfw, dy + dfh - cLen); ctx.stroke();

      // Label
      const label = `${hasMask ? '✓ Masked' : '✗ No Mask'} ${Math.round(maskConfidence * 100)}%`;
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      const labelY = dy > 30 ? dy - 6 : dy + dfh + 18;
      const padX = 8;
      const padY = 4;
      const lh = 18;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(dx, labelY - lh + padY, tw + padX * 2, lh + padY, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, dx + padX, labelY);

      // Tally stats
      if (hasMask) {
        stats.masked++;
        accumulatedStatsRef.current.masked++;
      } else {
        stats.unmasked++;
        accumulatedStatsRef.current.unmasked++;
        if (maskConfidence > 0.5) {
          violationDetected = true;
          highestConfidence = Math.max(highestConfidence, maskConfidence);
        }
      }
    });

    // Push stats to React state
    setDetectionStats(stats);

    // Debounced violation logging (max 1 every 5 s)
    const now = Date.now();
    if (violationDetected && now - lastViolationTimeRef.current > 5000) {
      lastViolationTimeRef.current = now;
      logViolation(highestConfidence, video);
    }

    // ---- Schedule the NEXT frame immediately ----
    if (isDetectingRef.current) {
      requestRef.current = requestAnimationFrame(runDetection);
    }
  }, []); // empty deps — everything via refs

  // ──────────────────────────────────────────────
  // 3. Violation logger (POST to backend)
  // ──────────────────────────────────────────────
  const logViolation = async (confidence, video) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    offscreen.getContext('2d').drawImage(video, 0, 0);
    const imageData = offscreen.toDataURL('image/jpeg', 0.5);

    try {
      await fetch('http://localhost:5000/api/violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image_data: imageData,
          confidence,
          description: 'Person detected without proper safety mask.'
        })
      });
    } catch (err) {
      console.error('[SafeGuard] Failed to log violation:', err);
    }
  };

  // ──────────────────────────────────────────────
  // 4. Send aggregated compliance stats to backend
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(async () => {
      const { masked, unmasked } = accumulatedStatsRef.current;
      if (masked > 0 || unmasked > 0) {
        try {
          await fetch('http://localhost:5000/api/stats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ masked, unmasked })
          });
          // Reset accumulator after pushing
          accumulatedStatsRef.current = { masked: 0, unmasked: 0 };
        } catch (err) {
          console.error('[SafeGuard] Failed to log compliance stats:', err);
        }
      }
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  // ──────────────────────────────────────────────
  // 5. Auto-start detection when both models are loaded
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (modelsLoaded.coco && modelsLoaded.mask && !isDetectingRef.current) {
      isDetectingRef.current = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(runDetection);
      console.log('[SafeGuard] 🟢 Auto-started detection — both models ready');
    }
  }, [modelsLoaded, runDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDetectingRef.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const bothModelsLoaded = modelsLoaded.coco && modelsLoaded.mask;

  // ──────────────────────────────────────────────
  // 5. Render
  // ──────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Live Camera Feed</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time object &amp; safety detection using custom AI</p>
        </div>
      </header>

      <div
        ref={containerRef}
        className="glass rounded-2xl overflow-hidden relative aspect-video shadow-2xl flex items-center justify-center bg-[#050505]"
      >
        {/* Loading overlay */}
        {!bothModelsLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-[#050505]/80 backdrop-blur-md">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium text-sm text-muted-foreground">Initializing AI Models…</p>
          </div>
        )}

        {/* Webcam video */}
        <Webcam
          ref={webcamRef}
          muted={true}
          className="absolute inset-0 w-full h-full object-cover"
          videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
        />

        {/* Detection overlay canvas — fills container exactly, no object-cover */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10"
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        />

        {/* Decorative border */}
        <div className="absolute inset-0 pointer-events-none border border-white/5 mix-blend-overlay z-20 rounded-2xl" />

        {/* HUD badges */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded text-xs font-mono border border-white/10 flex items-center gap-2 text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            CAM_01_MAIN
          </div>
          {bothModelsLoaded && (
            <div className="bg-primary/10 text-primary backdrop-blur-md px-3 py-1.5 rounded text-xs font-mono border border-primary/20 flex items-center gap-2">
              <ShieldCheck size={14} />
              AI_INFERENCE_ACTIVE
            </div>
          )}
        </div>

        {/* Live stats overlay */}
        {bothModelsLoaded && detectionStats.persons > 0 && (
          <div className="absolute bottom-4 right-4 z-20 bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Activity size={12} className="text-primary" />
              <span className="text-muted-foreground">Detected:</span>
              <span className="text-white font-bold">{detectionStats.persons}</span>
              {detectionStats.masked > 0 && (
                <span className="text-emerald-400">✓{detectionStats.masked}</span>
              )}
              {detectionStats.unmasked > 0 && (
                <span className="text-red-400">✗{detectionStats.unmasked}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
