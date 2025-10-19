# 🔧 Firebase CORS & Rules Quick Fix

You're getting CORS errors because Firebase Storage needs proper configuration for development.

## 🚀 **Quick Steps to Fix:**

### **1. Update Firebase Storage Rules** (Most Important)

Go to [Firebase Console](https://console.firebase.google.com/) → tiktok-genie project:

1. Click **Storage** in left sidebar
2. Click **Rules** tab  
3. Replace existing rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read/write for development - restrict in production!
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click **Publish**

### **2. Configure CORS (If Rules Don't Work)**

If you have Google Cloud SDK installed:

```bash
# Set your project
gcloud config set project tiktok-genie

# Apply CORS configuration (file already created)
gsutil cors set cors.json gs://tiktok-genie.firebasestorage.app
```

### **3. Code Fix Applied**

✅ Updated Firebase service to use `uploadBytes` instead of `uploadBytesResumable`  
✅ Better error handling for CORS issues  
✅ Simplified upload process to avoid preflight issues  

## 🧪 **Test the Fix:**

1. **Update Storage Rules** in Firebase Console (step 1 above)
2. **Refresh your browser** 
3. **Try uploading an image** again
4. Check browser console for any remaining errors

## 🔄 **If Still Getting CORS Errors:**

The CORS policy might be cached. Try:
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Open incognito/private window
- Clear browser cache for `http://127.0.0.1:5173`

## ✅ **Expected Result:**

After fixing Storage Rules, you should see:
- ✅ File uploads successfully to Firebase Storage
- ✅ Green success message with Firebase URL
- ✅ No CORS errors in console
- ✅ Backend can process the Firebase URLs

The Storage Rules change is usually all that's needed for development!