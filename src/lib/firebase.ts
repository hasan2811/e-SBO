import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyD-P_1XOQ9xQOgxwMApClEFoqHcxs7fYPI",
  authDomain: "hssetech-e1710.firebaseapp.com",
  projectId: "hssetech-e1710",
  storageBucket: "hssetech-e1710.firebasestorage.app",
  messagingSenderId: "789147047426",
  appId: "1:789147047426:web:7a37fdc4adfb51905bb91b",
  measurementId: "G-X84C2SP8MH"
};

// Check for missing environment variables to prevent runtime errors.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Firebase config is missing. Make sure you have a .env file with all the required NEXT_PUBLIC_FIREBASE_ variables.'
  );
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics if running in the browser
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      getAnalytics(app);
    }
  });
}


export { app, db, auth, storage };
