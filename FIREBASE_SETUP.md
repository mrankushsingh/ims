# Firebase Authentication Setup

## Environment Variables

### Backend (Railway) ✅ Already Set
**FIREBASE_SERVICE_ACCOUNT** - The entire Firebase service account JSON as a single string (minified JSON)

You already have this set! The service account JSON should be minified (all on one line) and set as the value.

### Frontend (Railway/Vercel) ⚠️ NEEDS TO BE SET
Add these environment variables to your frontend deployment:

- **VITE_FIREBASE_API_KEY** - Your Firebase API key
- **VITE_FIREBASE_AUTH_DOMAIN** - `anisa-28059.firebaseapp.com` (based on your project ID)
- **VITE_FIREBASE_PROJECT_ID** - `anisa-28059` (from your service account)
- **VITE_FIREBASE_STORAGE_BUCKET** - `anisa-28059.appspot.com` (usually project-id.appspot.com)
- **VITE_FIREBASE_MESSAGING_SENDER_ID** - Your Firebase messaging sender ID
- **VITE_FIREBASE_APP_ID** - Your Firebase app ID

## How to Get Frontend Firebase Config

### Option 1: From Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **anisa-28059**
3. Click the **gear icon** (⚙️) next to "Project Overview" → **Project Settings**
4. Scroll down to **"Your apps"** section
5. If you see a web app (</> icon), click on it
6. If you don't have a web app:
   - Click **"Add app"** → Select **Web** (</>)
   - Register the app (you can name it anything, e.g., "Immigration Case Manager")
   - You'll see the `firebaseConfig` object
7. Copy the values from the `firebaseConfig`:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",           // ← VITE_FIREBASE_API_KEY
     authDomain: "anisa-28059.firebaseapp.com",  // ← VITE_FIREBASE_AUTH_DOMAIN
     projectId: "anisa-28059",    // ← VITE_FIREBASE_PROJECT_ID
     storageBucket: "anisa-28059.appspot.com",   // ← VITE_FIREBASE_STORAGE_BUCKET
     messagingSenderId: "123456789",  // ← VITE_FIREBASE_MESSAGING_SENDER_ID
     appId: "1:123456789:web:abc123"  // ← VITE_FIREBASE_APP_ID
   };
   ```

### Option 2: From Firebase Project Settings
1. Go to Firebase Console → Project Settings
2. Under **"General"** tab, you'll find:
   - **Project ID**: `anisa-28059` ✅ (you have this)
   - **Web API Key**: Found in the same section
3. For other values, you may need to create a web app first

## Setting Up Users in Firebase

1. Go to Firebase Console → **Authentication**
2. Click **"Get started"** if you haven't enabled it
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"** provider
5. Click **"Users"** tab to add users manually:
   - Click **"Add user"**
   - Enter email and password
   - Click **"Add user"**

## Quick Setup Checklist

### Backend (Railway) ✅
- [x] FIREBASE_SERVICE_ACCOUNT set (you have this)

### Frontend (Railway/Vercel) ⚠️
- [ ] VITE_FIREBASE_API_KEY
- [ ] VITE_FIREBASE_AUTH_DOMAIN (`anisa-28059.firebaseapp.com`)
- [ ] VITE_FIREBASE_PROJECT_ID (`anisa-28059`)
- [ ] VITE_FIREBASE_STORAGE_BUCKET (`anisa-28059.appspot.com`)
- [ ] VITE_FIREBASE_MESSAGING_SENDER_ID
- [ ] VITE_FIREBASE_APP_ID

## Notes

- The app will work with **fallback authentication** if Firebase frontend config is not set
- Once you add the frontend config, Firebase Authentication will be used automatically
- The backend uses Firebase Admin SDK to verify tokens
- The frontend uses Firebase Client SDK for authentication
- All API requests automatically include the Firebase ID token in the Authorization header

