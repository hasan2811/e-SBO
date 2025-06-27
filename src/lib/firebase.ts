import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD-P_1XOQ9xQOgxwMApClEFoqHcxs7fYPI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hssetech-e1710.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hssetech-e1710",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hssetech-e1710.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "789147047426",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:789147047426:web:7a37fdc4adfb51905bb91b",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-X84C2SP8MH"
};

// Check for missing environment variables to prevent runtime errors.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Firebase config is missing. Make sure you have a .env.local file with all the required NEXT_PUBLIC_FIREBASE_ variables, or that the environment provides them.'
  );
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics & Firestore Persistence if running in the browser
if (typeof window !== 'undefined') {
  // Enable Firestore offline persistence
  try {
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn('Firestore persistence failed: multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          console.warn('Firestore persistence not available in this browser.');
        }
      });
  } catch (err) {
    console.error("Error enabling Firestore persistence:", err);
  }

  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      getAnalytics(app);
    }
  });
}


export { app, db, auth, storage };
