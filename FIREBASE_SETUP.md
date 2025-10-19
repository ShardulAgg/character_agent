# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" 
3. Enter project name (e.g., "tiktok-genie")
4. Follow the setup wizard

## 2. Enable Firebase Storage

1. In Firebase Console, go to "Storage" 
2. Click "Get started"
3. Choose security rules (start in test mode for development)
4. Select a storage location

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" 
3. Click "Web app" icon (</>)
4. Register your app with a nickname
5. Copy the Firebase config object

## 4. Update Environment Variables

Edit `frontend-react/.env`:

```env
VITE_API_URL=http://localhost:8000

# Firebase Configuration (replace with your values)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 5. Security Rules (Optional)

For production, update Firebase Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{allPaths=**} {
      allow read, write: if true; // Adjust as needed
    }
    match /voices/{allPaths=**} {
      allow read, write: if true; // Adjust as needed
    }
  }
}
```

## 6. Test the Setup

1. Start the React frontend: `cd frontend-react && npm run dev`
2. Upload a file to test Firebase integration
3. Check Firebase Console > Storage to see uploaded files