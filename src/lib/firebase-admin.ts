import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK.
// This is safe to run in a server environment and will only initialize once.
if (!admin.apps.length) {
  admin.initializeApp({
    // Explicitly provide the Project ID and Storage Bucket. This is crucial for
    // environments where Application Default Credentials (ADC) might not
    // automatically resolve all configuration details.
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Export the initialized admin services.
const storage = admin.storage();
export { storage };
