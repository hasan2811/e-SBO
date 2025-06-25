import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK.
// This is safe to run in a server environment and will only initialize once.
if (!admin.apps.length) {
  admin.initializeApp({
    // Credentials are automatically inferred from the environment in App Hosting.
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Export the initialized admin services.
const storage = admin.storage();
export { storage };
