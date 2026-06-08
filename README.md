# 🛡️ SafeGuard-AI

<a href="https://safeguard--ai.vercel.app/" target="_blank">
  <img src="https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=vercel" alt="Live Demo" />
</a>

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=nodedotjs)
![TensorFlow.js](https://img.shields.io/badge/ML-TensorFlow.js-orange?logo=tensorflow)

## 📖 About

**SafeGuard-AI** is a comprehensive, real-time AI surveillance system designed to monitor camera feeds and detect security and safety violations, such as individuals not wearing face masks. Built with a modern web stack and deep learning technologies, it provides actionable insights and alerts through an intuitive dashboard.

## 🏗️ System Architecture

The application follows a streamlined data flow for real-time processing:
1. **Camera Stream:** The React frontend captures video directly from the user's webcam or connected cameras.
2. **TensorFlow.js Inference:** Video frames are processed locally in the browser. The AI model detects persons and classifies whether they are wearing a mask.
3. **React UI:** The frontend draws bounding boxes on the live feed and updates inference metrics in real-time.
4. **Node.js/MongoDB Logging:** When a violation is detected (e.g., no mask), the frontend sends an alert to the Express backend, which securely logs the event into the MongoDB database.
## ✨ Key Features

- **Real-time Face Mask Detection:** Continuously processes video feeds directly in the browser using TensorFlow.js.
- **Live Feed Dashboard:** Beautiful, modern React interface for monitoring camera streams and inference metrics.
- **Automated Violation Logging:** Instantly captures and logs detection events to the backend database.
- **Secure Authentication:** JWT-based login system for securing access to the dashboard.
- **Responsive UI:** Dynamic, user-friendly interface powered by Tailwind CSS.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB
- **Machine Learning:** TensorFlow.js, TensorFlow (Python for model training and conversion)

## 📑 Table of Contents

- [System Architecture](#️-system-architecture)
- [Prerequisites](#-prerequisites)
- [Dataset Attribution](#-dataset-attribution)
- [Installation & Setup](#-installation--setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup (Node.js)](#2-backend-setup-nodejs)
  - [3. Frontend Setup (React)](#3-frontend-setup-react)
  - [4. ML Model Setup (Python - Optional)](#4-ml-model-setup-python---optional)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## 📋 Prerequisites

Ensure you have the following installed on your machine before setting up the project:

- **Node.js** (v16.x or higher)
- **npm** (comes with Node.js)
- **Python** (v3.8+, required only if retraining or converting ML models)
- **pip** (Python package installer)
- **Git**

## 🚀 Deployment
This project is configured for continuous deployment to ensure high availability and fast load times.

1. Frontend (Vercel)
The React application is deployed on Vercel, utilizing their global edge network for optimized performance.

Platform: Vercel

Build Command: npm run build

Output Directory: dist

Live URL: [https://safeguard--ai.vercel.app/](https://safeguard--ai.vercel.app/)

2. Backend (Render)
The Node.js/Express API is hosted on Render, handling authentication and database logging via MongoDB.

Platform: Render (Web Service)

Start Command: node server.js

Environment Configuration: Securely managed via Render's dashboard (MONGODB_URI, JWT_SECRET).

## 📊 Dataset Attribution

The AI model was trained using the **Face Mask Dataset** curated by Omkar Gurav. 
To keep the repository clean and optimized, the raw dataset is not included in the source code.

🔗 **[Download the Dataset from Kaggle](https://www.kaggle.com/datasets/omkargurav/face-mask-dataset)**

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ajayy1117/SafeGuard-AI.git
cd SafeGuard-AI
```

### 2. Backend Setup (Node.js)

The backend API handles authentication and violation logging. *(Note: While some project architectures use Flask, this project utilizes a fast Node.js/Express backend).*

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
# Create a .env file and add your config (e.g., MONGODB_URI, JWT_SECRET, PORT=5000)

# Start the backend development server
npm run dev
```

### 3. Frontend Setup (React)

The frontend handles the UI and the real-time browser-based AI inference.

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the React (Vite) development server
npm run dev
```
The app will be accessible at `http://localhost:5173`.

### 4. ML Model Setup (Python - Optional)

If you intend to retrain or modify the machine learning models, set up the Python environment:

```bash
# Navigate to the ml directory
cd ml

# It is highly recommended to create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install required Python packages
pip install -r requirements.txt
```

## 🚑 Troubleshooting

- **Camera Permission Denied:** Ensure that your browser has permission to access the webcam. Check the URL bar for a blocked camera icon and allow access. If testing on mobile, ensure you are using HTTPS.
- **CORS Errors / API Fails to Connect:** Verify that the Node.js backend is running on `http://localhost:5000` and that your frontend API configuration points to the correct URL.
- **Model Loading Issues:** If the TensorFlow model fails to load, ensure that the model files (`model.json` and `.bin` shards) are placed correctly in the frontend's `public/model/` directory.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
