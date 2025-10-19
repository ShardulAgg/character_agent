# Email-Based User System

## Overview
The TikTok Genie app now uses an email-based user system that stores user information and media references in Firestore.

## Data Structure

### EmailUser Collection (`email_users`)
Documents use email as the document ID (with special characters replaced).

```typescript
interface EmailUser {
  email: string;           // User's email address
  displayName?: string;    // Optional display name
  imageIds: string[];      // Array of image document IDs
  voiceIds: string[];      // Array of voice document IDs  
  projectIds: string[];    // Array of project document IDs
  createdAt: Date;         // Account creation date
  updatedAt: Date;         // Last profile update
  lastActive?: Date;       // Last activity timestamp
}
```

## Document ID Format
- Email: `user@example.com` → Document ID: `user_example_com`
- Special characters (`@`, `.`) are replaced with underscores (`_`)

## Collections Structure
```
firestore/
├── email_users/          # Email-based user profiles
│   ├── user_example_com  # Document ID from email
│   └── admin_company_org
├── images/               # Image metadata
├── voices/               # Voice metadata
└── projects/             # Project metadata
```

## Workflow

### 1. User Creation/Update
When a user enters their email:
```typescript
await FirestoreService.createOrUpdateEmailUser(email, displayName);
```
- Creates new user if doesn't exist
- Updates `lastActive` timestamp if exists
- Optionally updates `displayName`

### 2. Media Upload Process
When uploading images/voices:
1. Upload file to Firebase Storage
2. Create metadata document in `images/` or `voices/`
3. Update user profile with media ID reference
```typescript
// After creating image metadata
await FirestoreService.addImageToUser(email, imageId);

// After creating voice metadata  
await FirestoreService.addVoiceToUser(email, voiceId);
```

### 3. User Profile Display
The `UserProfile` component shows:
- User information (email, creation date, last active)
- Media statistics (count of images, voices, projects)
- Recent activity (last 3 uploads)

## Security Rules (Development)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all operations for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Security Rules (Production)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Email users can read/write their own profile
    match /email_users/{userId} {
      allow read, write: if userId == resource.data.email.replace(/[@.]/g, '_');
    }
    
    // Media access based on userEmail field
    match /images/{imageId} {
      allow read, write: if resource.data.userEmail == request.auth.token.email;
    }
    
    match /voices/{voiceId} {
      allow read, write: if resource.data.userEmail == request.auth.token.email;
    }
  }
}
```

## Benefits
1. **Simple Authentication**: No complex auth system needed
2. **User Tracking**: Track user activity and media uploads
3. **Data Organization**: Clear relationship between users and their media
4. **Analytics Ready**: Easy to generate usage statistics
5. **Scalable**: Can easily add more user fields and references

## Usage in Components
- Upload components automatically create/update user profiles
- User profile appears when email is provided
- Real-time updates as users upload media
- Cross-component email state management via props

This system provides a foundation for user management while keeping authentication simple and focused on email-based identification.