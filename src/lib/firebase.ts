// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration, using the correct API key.
const firebaseConfig = {
  apiKey: "AIzaSyBiL2rG3cd5VRK6VcX5Op_2T1CcehOBVRc",
  authDomain: "hssetech-e1710.firebaseapp.com",
  projectId: "hssetech-e1710",
  storageBucket: "hssetech-e1710.firebasestorage.app",
  messagingSenderId: "789147047426",
  appId: "1:789147047426:web:7a37fdc4adfb51905bb91b",
  measurementId: "G-X84C2SP8MH"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics if supported
try {
    if (typeof window !== 'undefined' && isSupported()) {
        getAnalytics(app);
    }
} catch (error) {
    console.log('Failed to initialize Analytics', error);
}


export { app, db, auth, storage };
