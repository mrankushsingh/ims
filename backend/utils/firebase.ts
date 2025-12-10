import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseInitialized = false;

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to use environment variable first (for production/Railway)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      firebaseInitialized = true;
    } else {
      // Try to load from file (for local development)
      const serviceAccountPath = join(__dirname, '../firebase-service-account.json');
      if (existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
        firebaseInitialized = true;
      } else {
        console.warn('⚠️  Firebase service account not found. Authentication will be disabled.');
        console.warn('   Set FIREBASE_SERVICE_ACCOUNT environment variable or add firebase-service-account.json');
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('⚠️  Authentication will be disabled.');
  }
} else {
  firebaseInitialized = true;
}

export const auth = firebaseInitialized ? admin.auth() : null;
export const isFirebaseInitialized = () => firebaseInitialized;
export default admin;

