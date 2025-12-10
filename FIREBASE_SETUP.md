# Firebase Authentication Setup

## Overview
This application uses Firebase Authentication for secure user login. The setup includes both backend (Firebase Admin SDK) and frontend (Firebase Client SDK) configurations.

## Backend Setup

### Local Development

The Firebase service account JSON file should be placed at:
- `backend/firebase-service-account.json`

**⚠️ IMPORTANT:** This file contains sensitive credentials and is already added to `.gitignore`. Do NOT commit it to version control.

### Production/Railway Deployment

For Railway or other production environments, you need to set the `FIREBASE_SERVICE_ACCOUNT` environment variable:

1. Go to your Railway project settings
2. Add a new environment variable:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** The entire JSON content of your service account file (as a single-line JSON string)

**Example:**
```json
{"type":"service_account","project_id":"anisa-28059",...}
```

**Note:** The application will work without Firebase (authentication will be disabled), but for full functionality, you must set this environment variable.

## Frontend Setup

### Step 1: Get Firebase Web Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **anisa-28059**
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. If you don't have a web app, click "Add app" and select the web icon (</>)
7. Copy the Firebase configuration object

### Step 2: Update Firebase Config

Open `frontend/src/firebase-config.ts` and replace the placeholder values with your actual Firebase web configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "anisa-28059.firebaseapp.com",
  projectId: "anisa-28059",
  storageBucket: "anisa-28059.appspot.com",
  messagingSenderId: "117413819552065484031",
  appId: "YOUR_APP_ID"
};
```

### Step 3: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Enable and configure
   - **Google**: Enable and configure (add authorized domains if needed)

## Features

- ✅ Email/Password authentication
- ✅ Google Sign-In
- ✅ Secure token verification on backend
- ✅ Protected routes
- ✅ User session management
- ✅ Professional login UI with glassmorphism design

## Usage

1. Users can sign in with email/password or Google
2. Authentication tokens are stored securely in localStorage
3. All API calls can be protected using the `verifyToken` middleware
4. Users are automatically signed out when tokens expire

## Security Notes

- Never commit `firebase-service-account.json` to version control
- Keep your Firebase API keys secure
- Use environment variables for sensitive configuration in production
- Regularly rotate service account keys

