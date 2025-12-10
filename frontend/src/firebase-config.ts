import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyReplaceWithYourActualKey",
  authDomain: "anisa-28059.firebaseapp.com",
  projectId: "anisa-28059",
  storageBucket: "anisa-28059.appspot.com",
  messagingSenderId: "117413819552065484031",
  appId: "1:117413819552065484031:web:dummy"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;

