# Backend Setup Instructions

## Current Issue
The backend requires dependencies that cannot be installed due to network/proxy issues:
- `firebase-admin==6.4.0`
- `fastapi`, `uvicorn`, etc. from requirements.txt

## Temporary Solution
A mock Firebase service has been created to allow development without firebase-admin:
- `firebase_service_mock.py` - Mock implementation with sample data
- `main.py` - Updated with fallback import logic

## Installation (when network issues are resolved)

### 1. Install Dependencies
```bash
cd /Users/aronimadass/Desktop/projects/tiktok-genie
pip install -r requirements.txt
```

### 2. Firebase Setup
```bash
# Download service account key from Firebase Console
# Save as: backend/service-account-key.json

# Set environment variable
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json
```

### 3. Run Backend
```bash
cd backend
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints Ready

### Batch Processing
- `POST /batch-process-users` - Start processing all email users
- `GET /batch-process-status` - Get real-time processing status  
- `GET /batch-process-results` - Get detailed results

### Existing Endpoints
- `GET /health` - Health check
- `POST /process-image-firebase` - Process single image from Firebase
- `POST /process-voice-firebase` - Process single voice from Firebase

## Mock Data Testing
The mock service provides sample users:
```json
[
  {
    "email": "user@example.com",
    "imageIds": ["img_123", "img_456"],
    "voiceIds": ["voice_789"]
  },
  {
    "email": "test@user.org", 
    "imageIds": ["img_abc"],
    "voiceIds": ["voice_def", "voice_ghi"]
  }
]
```

## Frontend Integration
The BatchProcessor component will work with both mock and real Firebase services:
- Real-time progress monitoring
- Error display
- File download simulation

## Next Steps
1. **Resolve network issues** to install dependencies
2. **Set up Firebase credentials** when ready for production
3. **Test with real Firestore data** once Firebase is connected
4. **Monitor logs** for processing details

The batch processing API structure is complete and ready to use once dependencies are installed!