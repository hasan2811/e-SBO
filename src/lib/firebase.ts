// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration is now hardcoded as requested.
// PLEASE REPLACE THE "YOUR_..._HERE" PLACEHOLDERS WITH YOUR ACTUAL VALUES.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "hssetech-e1710.firebaseapp.com",
  projectId: "hssetech-e1710",
  storageBucket: "hssetech-e1710.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

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
