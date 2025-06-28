
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// This check runs only in the user's browser. If the API key is missing here,
// it's a fatal error because the secrets were not injected correctly.
if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
    document.body.innerHTML = 'FATAL ERROR: Firebase configuration is missing. Please check App Hosting secrets and redeploy.';
    throw new Error('Firebase configuration is missing on the client.');
}


// Initialize Firebase.
// During the build process (`next build`), the API key may be undefined.
// We pass a dummy object `{}` to initializeApp to prevent the build from crashing.
// At runtime in the browser, the correct firebaseConfig will be present and used.
const app = !getApps().length ? initializeApp(firebaseConfig.apiKey ? firebaseConfig : {}) : getApp();

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
