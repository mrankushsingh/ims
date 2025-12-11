# Firebase Authentication Setup

## Environment Variables

### Backend (Railway)
Add this environment variable in Railway:

**FIREBASE_SERVICE_ACCOUNT** - The entire Firebase service account JSON as a single string (minified JSON)

Example:
```json
{"type":"service_account","project_id":"anisa-28059","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@anisa-28059.iam.gserviceaccount.com",...}
```

### Frontend (Vercel/Railway)
Add these environment variables:

- **VITE_FIREBASE_API_KEY** - Your Firebase API key
- **VITE_FIREBASE_AUTH_DOMAIN** - Your Firebase auth domain (e.g., `anisa-28059.firebaseapp.com`)
- **VITE_FIREBASE_PROJECT_ID** - Your Firebase project ID (e.g., `anisa-28059`)
- **VITE_FIREBASE_STORAGE_BUCKET** - Your Firebase storage bucket (e.g., `anisa-28059.appspot.com`)
- **VITE_FIREBASE_MESSAGING_SENDER_ID** - Your Firebase messaging sender ID
- **VITE_FIREBASE_APP_ID** - Your Firebase app ID

## Getting Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`anisa-28059`)
3. Go to Project Settings (gear icon)
4. Under "Your apps", click on the web app or create a new one
5. Copy the `firebaseConfig` object values

## Setting Up Users

1. Go to Firebase Console → Authentication
2. Enable "Email/Password" sign-in method
3. Add users manually or allow registration

## Notes

- The backend uses Firebase Admin SDK to verify tokens
- The frontend uses Firebase Client SDK for authentication
- All API requests automatically include the Firebase ID token in the Authorization header

