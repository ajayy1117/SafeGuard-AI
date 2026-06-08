import os
import unittest
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

class TestMaskDetectorModel(unittest.TestCase):
    MODEL_PATH = r"C:\surviliance system\ml\mask_detector.h5"
    DATA_DIR = r"C:\surviliance system\face-mask-dataset\data"

    @classmethod
    def setUpClass(cls):
        # Check model file exists
        if not os.path.exists(cls.MODEL_PATH):
            raise unittest.SkipTest(f"Model file not found at {cls.MODEL_PATH}")
        cls.model = tf.keras.models.load_model(cls.MODEL_PATH)

    def test_model_summary(self):
        # Verify the model compiled structure is correct
        self.assertIsNotNone(self.model)
        self.assertEqual(len(self.model.outputs), 1)
        # MobileNetV2 custom head returns shape (None, 2)
        self.assertEqual(self.model.outputs[0].shape[-1], 2)

    def test_inference_shape(self):
        # Create a mock/dummy image batch of shape (1, 224, 224, 3)
        dummy_input = np.random.uniform(-1.0, 1.0, (1, 224, 224, 3)).astype(np.float32)
        predictions = self.model.predict(dummy_input)
        self.assertEqual(predictions.shape, (1, 2))
        # Verify softmax output sums to ~1
        np.testing.assert_allclose(np.sum(predictions, axis=1), [1.0], rtol=1e-5)

    def test_real_images_inference(self):
        # Find some real images from the dataset and run inference
        with_mask_dir = os.path.join(self.DATA_DIR, "with_mask")
        without_mask_dir = os.path.join(self.DATA_DIR, "without_mask")

        loaded_images = []
        labels = []

        # Load up to 2 images from with_mask
        if os.path.exists(with_mask_dir):
            files = [f for f in os.listdir(with_mask_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))][:2]
            for f in files:
                img_path = os.path.join(with_mask_dir, f)
                img = load_img(img_path, target_size=(224, 224))
                img_arr = img_to_array(img)
                img_arr = preprocess_input(img_arr)
                loaded_images.append(img_arr)
                labels.append(0) # with_mask

        # Load up to 2 images from without_mask
        if os.path.exists(without_mask_dir):
            files = [f for f in os.listdir(without_mask_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))][:2]
            for f in files:
                img_path = os.path.join(without_mask_dir, f)
                img = load_img(img_path, target_size=(224, 224))
                img_arr = img_to_array(img)
                img_arr = preprocess_input(img_arr)
                loaded_images.append(img_arr)
                labels.append(1) # without_mask

        if len(loaded_images) > 0:
            batch = np.array(loaded_images)
            predictions = self.model.predict(batch)
            self.assertEqual(predictions.shape, (len(loaded_images), 2))
            print(f"\nPredictions for {len(loaded_images)} real images:")
            for i, pred in enumerate(predictions):
                expected = "with_mask" if labels[i] == 0 else "without_mask"
                pred_label = "with_mask" if np.argmax(pred) == 0 else "without_mask"
                confidence = pred[np.argmax(pred)]
                print(f"Image {i+1} (Expected: {expected}): Pred: {pred_label} (Conf: {confidence:.2f})")
        else:
            self.skipTest("No real images found for inference test.")

if __name__ == '__main__':
    unittest.main()
