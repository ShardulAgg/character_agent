# Firestore Setup Checklist

## Current Status: 400 Bad Request Error
This means Firestore is not properly configured.

## Steps to Fix:

### ✅ 1. Enable Firestore Database
- Go to: https://console.firebase.google.com/project/tiktok-genie
- Click "Firestore Database" in sidebar
- Click "Create database" 
- Choose "Start in test mode"
- Select location (recommend: us-central1)

### ✅ 2. Configure Security Rules
**For Development (Quick Fix):**
- Use rules from: `firestore-dev-rules.txt`
- Allows all read/write operations
- **WARNING: Not secure for production**

**For Production:**
- Use rules from: `firestore-production-rules.txt`
- Requires proper authentication
- More secure but complex

### ✅ 3. Test Connection
After setup, the SystemStatus component will show:
- ✅ Firestore: Healthy (if working)
- ❌ Firestore: Connection failed (if still broken)

### ✅ 4. Verify in Console
After setup, you should see:
- Collections being created when you upload files
- Documents appearing in Firestore Console
- No more 400 errors in browser console

## Your Current Config:
- Project ID: tiktok-genie
- Storage Bucket: tiktok-genie.firebasestorage.app
- Auth Domain: tiktok-genie.firebaseapp.com

## Need Help?
The error will disappear once Firestore is enabled and rules are configured.