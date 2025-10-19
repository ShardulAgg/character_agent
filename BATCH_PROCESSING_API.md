# Batch Media Processing API

## Overview
The Batch Media Processing API allows you to download all media files (images and voices) from Firebase Storage for every user in the `email_users` Firestore collection.

## API Endpoints

### 1. Start Batch Processing
```http
POST /batch-process-users
```

**Response:**
```json
{
  "message": "Batch processing started",
  "status": "processing",
  "endpoint": "/batch-process-status"
}
```

**Description:**
- Starts background processing of all email users
- Downloads images and voices from Firebase Storage
- Saves files to local `downloads/` directory
- Returns immediately and runs in background

### 2. Get Processing Status
```http
GET /batch-process-status
```

**Response:**
```json
{
  "status": "processing",
  "total_users": 10,
  "processed_users": 3,
  "current_user": "user@example.com",
  "errors": []
}
```

**Status Values:**
- `idle` - No processing active
- `processing` - Currently processing users
- `completed` - Processing finished successfully
- `failed` - Processing failed with errors

### 3. Get Detailed Results
```http
GET /batch-process-results
```

**Response:**
```json
{
  "status": "completed",
  "total_users_processed": 10,
  "successful_users": 8,
  "failed_users": 2,
  "total_files_downloaded": 45,
  "total_size_bytes": 125000000,
  "processing_time_seconds": 120.5,
  "user_results": [...],
  "global_errors": [...]
}
```

## How It Works

### 1. User Discovery
```python
# Get all users from email_users collection
users = await firebase_service.get_all_email_users()
```

### 2. For Each User
```python
for user in users:
    # Get user's imageIds and voiceIds arrays
    image_ids = user.get('imageIds', [])
    voice_ids = user.get('voiceIds', [])
    
    # For each image ID, get metadata and download file
    for image_id in image_ids:
        metadata = await get_image_metadata(image_id)
        storage_path = metadata['storagePath']
        file_data = await download_file_from_storage(storage_path)
        
    # Same process for voice files
```

### 3. File Storage Structure
```
downloads/
├── user_example_com/          # Email: user@example.com
│   ├── images/
│   │   ├── photo1.jpg
│   │   └── photo2.png
│   └── voices/
│       ├── recording1.mp3
│       └── recording2.wav
└── admin_company_org/         # Email: admin@company.org
    ├── images/
    └── voices/
```

## Frontend Integration

### BatchProcessor Component
Located at `/src/components/BatchProcessor.tsx`

**Features:**
- Start/stop batch processing
- Real-time progress monitoring
- Error display and handling
- Status polling every 2 seconds

**Usage:**
```tsx
import { BatchProcessor } from './components/BatchProcessor';

function App() {
  return (
    <div>
      <BatchProcessor />
    </div>
  );
}
```

## Configuration

### Environment Variables
```bash
# Backend (.env)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json
FIREBASE_STORAGE_BUCKET=tiktok-genie.firebasestorage.app
FIREBASE_PROJECT_ID=tiktok-genie

# Frontend (.env)
VITE_API_URL=http://localhost:8000
```

### Firebase Setup
1. **Service Account Key:**
   - Download from Firebase Console → Project Settings → Service Accounts
   - Place in backend directory as `service-account-key.json`
   - Set path in environment variable

2. **Firestore Collections Required:**
   - `email_users` - User profiles with imageIds/voiceIds arrays
   - `images` - Image metadata with storagePath
   - `voices` - Voice metadata with storagePath

## Error Handling

### User-Level Errors
- Missing image/voice metadata
- Failed Firebase Storage downloads
- File corruption or access issues

### Global Errors
- Firebase connection failures
- Insufficient permissions
- Network timeouts

### Error Recovery
- Processing continues for other users if one fails
- Detailed error logging with user context
- Partial results available even with errors

## Performance Considerations

### Memory Usage
- Files are downloaded and immediately saved to disk
- No large files kept in memory simultaneously
- Streaming downloads for large files

### Concurrency
- Sequential processing per user (no parallel downloads)
- Background processing doesn't block API
- Real-time status updates via polling

### Storage Requirements
- Local disk space = Total size of all user media files
- Temporary storage during processing
- Automatic cleanup on completion

## Monitoring and Logging

### Logs Include
- User processing start/completion
- File download success/failure
- Storage path resolution
- Error details with context

### Metrics Tracked
- Total users processed
- Success/failure rates
- Download speeds and file sizes
- Processing time per user

## Security Considerations

### Access Control
- Requires Firebase Admin SDK credentials
- Backend-only processing (no direct client access)
- Firestore security rules still apply

### Data Privacy
- Downloaded files stored locally only
- No data transmitted to external services
- User email obfuscation in file paths

## Scaling and Deployment

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run backend
python backend/main.py

# Run frontend
cd frontend-react && npm run dev
```

### Production Deployment
- Use Google Cloud Run or similar container service
- Mount persistent storage for downloads directory
- Configure Firebase service account authentication
- Set appropriate memory/CPU limits for large downloads

## Troubleshooting

### Common Issues

1. **"Firebase not initialized"**
   - Check service account key path
   - Verify Firebase project configuration

2. **"Permission denied"** 
   - Update Firestore security rules
   - Check service account permissions

3. **"File not found in storage"**
   - Verify storagePath in metadata
   - Check Firebase Storage bucket configuration

4. **"Processing stuck"**
   - Check backend logs for errors
   - Restart processing via API
   - Monitor network connectivity

### Debug Commands
```bash
# Check Firebase connection
curl http://localhost:8000/health

# Get current status
curl http://localhost:8000/batch-process-status

# Start processing
curl -X POST http://localhost:8000/batch-process-users
```

This batch processing system provides a complete solution for downloading and organizing all user media files from your Firebase Storage, with comprehensive monitoring and error handling capabilities.