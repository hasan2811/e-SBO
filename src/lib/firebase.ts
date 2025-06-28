
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, memoryLocalCache, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// HARDCODED Firebase configuration as per user request to ensure functionality.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDfwUsDhWnoywj0aYLxfLE2MDONCnI_gho",
  authDomain: "hssetech-e1710.firebaseapp.com",
  projectId: "hssetech-e1710",
  storageBucket: "hssetech-e1710.firebasestorage.app",
  messagingSenderId: "789147047426",
  appId: "1:789147047426:web:7a37fdc4adfb51905bb91b",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore for modern cache management, removing deprecation warnings.
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
