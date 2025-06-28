
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

// This is a dummy config object used ONLY during the build process
// to prevent the build from failing when the real environment variables
// are not yet available.
const DUMMY_CONFIG_FOR_BUILD = {
  apiKey: "build-time-dummy-key",
  authDomain: "build-time-dummy-domain.firebaseapp.com",
  projectId: "build-time-dummy-project-id",
  storageBucket: "build-time-dummy-bucket.appspot.com",
  messagingSenderId: "build-time-dummy-sender-id",
  appId: "build-time-dummy-app-id",
};


// Initialize Firebase.
// We check if a projectId is available. If not, it means we are in a build environment
// where secrets are not yet injected. In that case, we use the dummy config to allow the build to pass.
// At runtime, the correct firebaseConfig with real values will be used.
const app = !getApps().length 
    ? initializeApp(firebaseConfig.projectId ? firebaseConfig : DUMMY_CONFIG_FOR_BUILD) 
    : getApp();


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
