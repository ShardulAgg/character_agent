# Image & Voice Processing WebApp

A modern webapp with FastAPI backend and dual frontend options (Streamlit + React) that generates image variations and voice signatures using AI APIs.

## Features
- **Image Processing**: Upload images and generate variations using Google's Gemini API
- **Voice Processing**: Upload voice files and generate signatures using Eleven Labs
- **Dual Frontend**: Choose between Streamlit (Python) or React (TypeScript) interfaces
- **Cloud Ready**: Deployed on Google Cloud Platform with auto-scaling

## Tech Stack
- **Backend**: FastAPI + Python
- **Frontend**: 
  - Streamlit (Python-based UI)
  - React + TypeScript + Vite (Modern web UI)
- **APIs**: Google Gemini API, Eleven Labs API
- **Deployment**: Docker + Google Cloud Run
- **Styling**: Tailwind CSS (React frontend)

## Project Structure
```
tiktok-genie/
├── backend/                 # FastAPI backend
├── frontend/               # Streamlit frontend  
├── frontend-react/         # React + TypeScript frontend
├── docker-compose.yml      # Local development
├── cloudbuild.yaml        # GCP deployment
└── deploy.sh              # Deployment script
```

## Setup & Development

### Prerequisites
- Python 3.9+
- Node.js 18+ (for React frontend)
- Docker & Docker Compose

### Local Development

1. **Clone and setup**:
   ```bash
   ./setup.sh
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run with Docker Compose**:
   ```bash
   # Run all services
   docker-compose up --build
   
   # Or run specific frontend
   docker-compose up backend frontend-streamlit  # Streamlit UI
   docker-compose up backend frontend-react      # React UI
   ```

4. **Or run manually**:
   ```bash
   # Backend
   pip install -r requirements.txt
   uvicorn backend.main:app --reload
   
   # Streamlit Frontend
   streamlit run frontend/app.py
   
   # React Frontend
   cd frontend-react
   npm install
   npm run dev
   ```

### Access Points
- **Backend API**: http://localhost:8000
- **Streamlit UI**: http://localhost:8501  
- **React UI**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## Deployment

### Google Cloud Platform

1. **Setup GCP Project**:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Deploy**:
   ```bash
   ./deploy.sh YOUR_PROJECT_ID
   ```

This creates 3 Cloud Run services:
- `tiktok-genie-backend` (FastAPI)
- `tiktok-genie-frontend-streamlit` (Streamlit UI)
- `tiktok-genie-frontend-react` (React UI)

## Environment Variables

```bash
# Required API Keys
ELEVENLABS_API_KEY=your_elevenlabs_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key

# Optional
GOOGLE_CLOUD_PROJECT_ID=your_project_id
BACKEND_URL=http://localhost:8000  # For frontend
VITE_API_URL=http://localhost:8000  # For React frontend
```

## API Endpoints

- `POST /upload-image` - Upload image file
- `POST /upload-voice` - Upload voice file  
- `POST /generate-image-variations` - Generate image variations
- `POST /generate-voice-signature` - Generate voice signature
- `GET /health` - Health check

## Development Features

- **Hot Reload**: Both frontends support live development
- **Type Safety**: Full TypeScript support in React frontend
- **Modern UI**: Responsive design with Tailwind CSS
- **Error Handling**: Comprehensive error states and loading indicators
- **File Upload**: Drag-and-drop file upload with validation
- **Health Monitoring**: Real-time backend status checking