# 🔥 Firestore Setup Guide

## 1. Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/) → tiktok-genie project
2. Click **Firestore Database** in left sidebar
3. Click **Create database**
4. Choose **Start in test mode** (for development)
5. Select a location (same as your Storage bucket if possible)

## 2. Configure Firestore Security Rules

Replace the default rules with development-friendly rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own images
    match /images/{imageId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Users can read/write their own voices  
    match /voices/{voiceId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Users can read/write their own projects
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 3. Enable Authentication

1. Go to **Authentication** → **Sign-in method**
2. Enable **Google** sign-in provider
3. Add your domain (e.g., `localhost`, `127.0.0.1`) to authorized domains

## 4. Test the Integration

1. **Build and start your app**:
   ```bash
   npm run build
   # Serve the built app or use the dev server if working
   ```

2. **Test the flow**:
   - Click "Sign In with Google"
   - Upload an image
   - Check Firebase Console:
     - **Authentication** → Users (should show your user)
     - **Firestore Database** → Data (should show collections: users, images)
     - **Storage** → Files (should show uploaded image)

## 5. Data Structure Created

### Collections:
- **`users/`** - User profiles with email and metadata
- **`images/`** - Image metadata with Firebase Storage paths
- **`voices/`** - Voice metadata with Firebase Storage paths  
- **`projects/`** - Projects linking images and voices

### Document Structure:
```javascript
// images/{imageId}
{
  userId: "user_uid",
  userEmail: "user@example.com", 
  fileName: "1234567890_image.jpg",
  originalName: "my-image.jpg",
  storagePath: "images/1234567890_image.jpg",
  downloadUrl: "https://firebasestorage.googleapis.com/...",
  fileSize: 1024567,
  mimeType: "image/jpeg",
  processingStatus: "completed", // pending, processing, completed, failed
  variations: [...],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 6. What's New in the UI

✅ **Google Sign-In** - Required before uploading  
✅ **User Info Display** - Shows signed-in user  
✅ **Database Icon** - Indicates Firestore integration  
✅ **Metadata Display** - Shows Firestore document ID and status  
✅ **Processing Status** - Real-time status updates (pending → processing → completed)  
✅ **Error Tracking** - Failed uploads/processing logged to Firestore

The app now stores all metadata in Firestore while keeping the actual files in Firebase Storage!