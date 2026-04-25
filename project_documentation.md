# OptiRelief: AI-Powered Disaster Coordination Platform

OptiRelief is a tactical command center designed to optimize disaster relief efforts through an autonomous AI agent swarm and real-time GIS data integration.

## 🚀 Deployment Guide

### Prerequisites
- Docker & Docker Compose
- Google Gemini API Key (for Agent Intelligence)
- Firebase Project with Firestore enabled

### 1. Environment Setup
Rename `.env.example` to `.env` and fill in your keys.

### 2. Deployment (Unified)
This project is configured for **Firebase Hosting** and **Firebase Cloud Functions**.

```bash
# 1. Build the frontend
cd frontend
npm install
npm run build
cd ..

# 2. Deploy to Firebase
firebase deploy
```

*Note: The FastAPI backend will be automatically deployed as a Gen 2 Python Cloud Function named `api_v1`.*

## 🧠 AI Agent Swarm Architecture

| Agent | Purpose | Intelligence Level |
|-------|---------|-------------------|
| **Listener** | Text/Voice Task Extraction | Gemini 1.5 Flash |
| **Visionary** | Disaster Image Analysis | Gemini 1.5 Flash |
| **Chatbot** | Conversational RAG Assistant | Gemini 1.5 Flash |
| **Guardian** | Community Hope Score & Sentiment | Gemini 1.5 Flash |
| **Sentinel** | Inventory Health & Burn Rates | Gemini 1.5 Flash + Logic |
| **Dispatcher** | Resource/Volunteer Matching | TF-IDF / Cosine Similarity |

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS, Leaflet.js, Recharts
- **Backend**: FastAPI, Gunicorn, Uvicorn
- **Database**: Firebase Firestore
- **AI**: Google Gemini (Vertex AI / Generative AI SDK)
