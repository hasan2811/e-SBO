
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// During the build process (`next build`), environment variables from App Hosting secrets might not be available.
// This is a common scenario in CI/CD environments. To allow the build to succeed, we provide
// placeholder/dummy values. At runtime, Firebase App Hosting will inject the correct
// environment variables from the secrets, and those will be used.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "build-time-dummy-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:dummy",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // This one is optional and can be undefined
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
