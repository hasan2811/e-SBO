import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// This logic dynamically loads the Firebase configuration.
// In a Firebase hosting environment (like Firebase Studio), a `FIREBASE_CONFIG`
// environment variable is automatically provided as a JSON string.
// We prioritize that, and fall back to individual environment variables
// for local development or other environments.
const firebaseConfig: FirebaseOptions = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    };

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
