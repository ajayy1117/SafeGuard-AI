import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ShieldAlert, AlertCircle, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard({ token }) {
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState([]);
  const [realtimeAlert, setRealtimeAlert] = useState(null);

  useEffect(() => {
    // Fetch initial history
    fetch('http://localhost:5000/api/violations', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setViolations(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching logs:', err));

    // Fetch stats
    fetch('http://localhost:5000/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching stats:', err));

    // Socket.io for real-time updates
    const socket = io('http://localhost:5000');
    
    socket.on('new_violation', (violation) => {
      setViolations(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        return [violation, ...arr].slice(0, 50);
      }); // Keep last 50
      
      // Show toast alert
      setRealtimeAlert(violation);
      setTimeout(() => setRealtimeAlert(null), 5000);
    });

    socket.on('new_stats', (stat) => {
      setStats(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        return [stat, ...arr].slice(0, 500);
      });
    });

    return () => socket.disconnect();
  }, [token]);

  // Calculate Real Compliance Rate
  const totalMasked = stats.reduce((acc, curr) => acc + (curr.masked || 0), 0);
  const totalUnmasked = stats.reduce((acc, curr) => acc + (curr.unmasked || 0), 0);
  const total = totalMasked + totalUnmasked;
  const complianceRate = total === 0 ? 100 : Math.round((totalMasked / total) * 100);

  // Group violations by hour for the chart (last 6 hours)
  const getChartData = () => {
    const simpleHourly = {};
    const now = new Date();
    
    // Pre-fill last 6 hours (e.g., "14:00")
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hr = d.getHours().toString().padStart(2, '0') + ":00";
      simpleHourly[hr] = 0;
    }

    violations.forEach(v => {
      if (v && v.timestamp) {
         const date = new Date(v.timestamp);
         const hr = date.getHours().toString().padStart(2, '0') + ":00";
         if (simpleHourly[hr] !== undefined) {
            simpleHourly[hr]++;
         }
      }
    });

    return Object.keys(simpleHourly).map(time => ({ time, alerts: simpleHourly[time] }));
  };

  const chartData = getChartData();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 relative">
      {/* Real-time Alert Toast */}
      {realtimeAlert && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:top-8 md:right-8 z-50 animate-in slide-in-from-top md:slide-in-from-right fade-in glass border-destructive/50 bg-destructive/10 p-4 rounded-2xl shadow-2xl flex items-start gap-4 max-w-sm mx-auto md:mx-0">
          <div className="bg-destructive/20 p-2 rounded-full text-destructive shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-destructive">Safety Violation Detected!</h4>
            <p className="text-sm text-muted-foreground mt-1">{realtimeAlert.description}</p>
            <p className="text-xs text-muted-foreground mt-2 opacity-70">Just now • Cam_01</p>
          </div>
        </div>
      )}

      <header>
        <h2 className="text-3xl font-bold tracking-tight">Security Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of safety compliance and recent alerts</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert size={64} />
          </div>
          <div className="bg-destructive/10 text-destructive w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-3xl font-bold">{violations.length}</h3>
          <p className="text-muted-foreground font-medium mt-1">Total Violations Logged</p>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 size={64} />
          </div>
          <div className="bg-green-500/10 text-green-400 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-3xl font-bold">{complianceRate}%</h3>
          <p className="text-muted-foreground font-medium mt-1">Real Compliance Rate</p>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={64} />
          </div>
          <div className="bg-primary/20 text-primary w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <Activity size={24} />
          </div>
          <h3 className="text-3xl font-bold">Active</h3>
          <p className="text-muted-foreground font-medium mt-1">Database Connected</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 glass rounded-3xl border border-white/5 p-6 flex flex-col">
          <h3 className="text-xl font-bold mb-6">Violation Trends (Last 6 Hours)</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="alerts" stroke="hsl(var(--destructive))" strokeWidth={3} fillOpacity={1} fill="url(#colorAlerts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Logs Section */}
        <div className="glass rounded-3xl border border-white/5 p-6 flex flex-col h-[400px]">
          <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
            Recent Logs
            <span className="text-sm font-normal text-muted-foreground bg-white/5 px-3 py-1 rounded-full">Live</span>
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {!(violations && violations.length > 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                <ShieldAlert size={48} className="mb-4 opacity-20" />
                <p>No violations logged today.</p>
              </div>
            ) : (
              (violations || []).map((log, i) => {
                if (!log) return null;
                const timeStr = log.timestamp && !isNaN(new Date(log.timestamp)) 
                  ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : 'N/A';
                
                return (
                  <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 text-destructive font-semibold">
                        <AlertTriangle size={16} />
                        Safety Breach
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} />
                        {timeStr}
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 mb-3">{log.description || 'No description'}</p>
                    
                    {log.image_data && (
                      <div className="relative rounded-xl overflow-hidden aspect-video border border-white/10">
                        <img src={log.image_data} alt="Violation Snapshot" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/20 rounded-xl pointer-events-none" />
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono border border-white/10">
                          CONF: {Math.round((log.confidence || 0) * 100)}%
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
