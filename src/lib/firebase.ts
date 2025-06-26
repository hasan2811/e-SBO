import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyD-P_1XOQ9xQOgxwMApClEFoqHcxs7fYPI",
  authDomain: "hssetech-e1710.firebaseapp.com",
  projectId: "hssetech-e1710",
  storageBucket: "hssetech-e1710.appspot.com",
  messagingSenderId: "789147047426",
  appId: "1:789147047426:web:7a37fdc4adfb51905bb91b",
  measurementId: "G-X84C2SP8MH"
};

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
