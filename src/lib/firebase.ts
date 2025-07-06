
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
// We are removing getAnalytics to improve initial load performance.
// import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration, with the correct storageBucket name.
const firebaseConfig = {
  apiKey: "AIzaSyD-P_1XOQ9xQOgxwMApClEFoqHcxs7fYPI",
  authDomain: "hssetech-e1710.firebaseapp.com",
  projectId: "hssetech-e1710",
  storageBucket: "hssetech-e1710.firebasestorage.app",
  messagingSenderId: "789147047426",
  appId: "1:789147047426:web:7a37fdc4adfb51905bb91b",
  measurementId: "G-X84C2SP8MH"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the standard, idempotent getFirestore() to ensure a stable connection
// in both client and server environments.
const db = getFirestore(app);

const auth = getAuth(app);
const storage = getStorage(app);

// Analytics initialization has been removed to prioritize core app performance.
// It can be re-added later with a deferred loading strategy if needed.

export { app, db, auth, storage };
