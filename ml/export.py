import tensorflow as tf

model = tf.keras.models.load_model('mask_detector.h5')
# Export as raw TF SavedModel instead of Keras format to bypass Keras 3 incompatibility in TF.js
model.export('saved_model')
print("Exported to saved_model")
