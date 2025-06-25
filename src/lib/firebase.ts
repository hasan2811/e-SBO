import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyD-P_1XOQ9xQOgxwMApClEFoqHcxs7fYPI",
  authDomain: "hssetech-e1710.firebaseapp.com",
  projectId: "hssetech-e1710",
  storageBucket: "hssetech-e1710.appspot.com",
  messagingSenderId: "789147047426",
  appId: "1:789147047426:web:7a37fdc4adfb51905bb91b",
  measurementId: "G-X84C2SP8MH"
};

// Comprehensive check for all required Firebase config variables
// This helps pinpoint exactly which environment variables are missing.
const missingConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfigKeys.length > 0) {
  const variableNames = missingConfigKeys.map(key => 
    `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`
  );
  throw new Error(
    `Firebase config is missing or incomplete. Please ensure the following environment variables are set: ${variableNames.join(', ')}`
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
    if (supported) {
      getAnalytics(app);
    }
  });
}


export { app, db, auth, storage };
