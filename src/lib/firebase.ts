
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration is now securely loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Basic validation to ensure environment variables are loaded
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration environment variables are not set. Please check your .env.local file.");
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore for modern cache management.
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics if running in the browser
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

export { app, db, auth, storage };
