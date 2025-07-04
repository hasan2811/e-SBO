
import * as admin from 'firebase-admin';

// This file is for server-side operations only.

// Check if the app is already initialized to prevent errors in hot-reloading environments.
if (!admin.apps.length) {
  try {
    // In a Google Cloud environment (like App Hosting or Cloud Workstations),
    // the SDK automatically finds the project's service account credentials.
    admin.initializeApp({
      storageBucket: 'hssetech-e1710.firebasestorage.app',
    });
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
}

// Export the admin services to be used in server actions.
const adminDb = admin.firestore();
const adminStorage = admin.storage();

export { adminDb, adminStorage };
