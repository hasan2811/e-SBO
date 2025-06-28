
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const getFirebaseConfig = (): FirebaseOptions => {
  // Try to use the user-defined, more reliable environment variables first.
  // These will be available at runtime in the browser and on the server.
  const userDefinedConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // If the user-defined API key is present, we are at runtime. Use it.
  if (userDefinedConfig.apiKey) {
    return userDefinedConfig;
  }
  
  // If we are at build time, App Hosting provides this variable.
  // We use this to allow the build process to complete without errors.
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    } catch (e) {
        console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
        // Fall through to the final fallback if parsing fails.
    }
  }

  // As a final fallback for local development without a .env file,
  // this prevents the app from crashing completely during local dev server start.
  return {
    apiKey: "local-dev-dummy-key",
    authDomain: "local-dev.firebaseapp.com",
    projectId: "local-dev",
    storageBucket: "local-dev.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:1234567890",
  };
};


const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics & Firestore Persistence if running in the browser
if (typeof window !== 'undefined') {
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
