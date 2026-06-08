import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import AveragePooling2D, Dropout, Flatten, Dense, Input
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import subprocess

print("TensorFlow Version:", tf.__version__)

INIT_LR = 1e-4
EPOCHS = 3 # Keep it small for speed in this environment
BS = 32

DIRECTORY = r"C:\surviliance system\face-mask-dataset\data"

print("[INFO] loading images...")

aug = ImageDataGenerator(
	rotation_range=20,
	zoom_range=0.15,
	width_shift_range=0.2,
	height_shift_range=0.2,
	shear_range=0.15,
	horizontal_flip=True,
	fill_mode="nearest",
    preprocessing_function=preprocess_input,
    validation_split=0.2
)

train_generator = aug.flow_from_directory(
    DIRECTORY,
    target_size=(224, 224),
    batch_size=BS,
    class_mode="categorical",
    subset="training"
)

val_generator = aug.flow_from_directory(
    DIRECTORY,
    target_size=(224, 224),
    batch_size=BS,
    class_mode="categorical",
    subset="validation"
)

print("[INFO] compiling model...")
baseModel = MobileNetV2(weights="imagenet", include_top=False, input_tensor=Input(shape=(224, 224, 3)))

for layer in baseModel.layers:
	layer.trainable = False

headModel = baseModel.output
headModel = AveragePooling2D(pool_size=(7, 7))(headModel)
headModel = Flatten(name="flatten")(headModel)
headModel = Dense(128, activation="relu")(headModel)
headModel = Dropout(0.5)(headModel)
headModel = Dense(2, activation="softmax")(headModel) # 2 classes: with_mask, without_mask

model = Model(inputs=baseModel.input, outputs=headModel)

opt = Adam(learning_rate=INIT_LR)
model.compile(loss="categorical_crossentropy", optimizer=opt, metrics=["accuracy"])

print("[INFO] training head...")
H = model.fit(
	train_generator,
	steps_per_epoch=train_generator.samples // BS,
	validation_data=val_generator,
	validation_steps=val_generator.samples // BS,
	epochs=EPOCHS
)

print("[INFO] saving model...")
model.save("mask_detector.h5")

print("[INFO] converting model to tfjs format...")
subprocess.run([
    "tensorflowjs_converter",
    "--input_format=keras",
    "mask_detector.h5",
    "tfjs_model"
], check=True)

print("[INFO] completed successfully!")
