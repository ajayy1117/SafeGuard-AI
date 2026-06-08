# 🛡️ SafeGuard-AI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=nodedotjs)
![TensorFlow.js](https://img.shields.io/badge/ML-TensorFlow.js-orange?logo=tensorflow)

## 📖 About

**SafeGuard-AI** is a comprehensive, real-time AI surveillance system designed to monitor camera feeds and detect security and safety violations, such as individuals not wearing face masks. Built with a modern web stack and deep learning technologies, it provides actionable insights and alerts through an intuitive dashboard.

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

- [Prerequisites](#-prerequisites)
- [Dataset Attribution](#-dataset-attribution)
- [Installation & Setup](#-installation--setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup (Node.js)](#2-backend-setup-nodejs)
  - [3. Frontend Setup (React)](#3-frontend-setup-react)
  - [4. ML Model Setup (Python - Optional)](#4-ml-model-setup-python---optional)

## 📋 Prerequisites

Ensure you have the following installed on your machine before setting up the project:

- **Node.js** (v16.x or higher)
- **npm** (comes with Node.js)
- **Python** (v3.8+, required only if retraining or converting ML models)
- **pip** (Python package installer)
- **Git**

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
