
import * as admin from 'firebase-admin';

// This file is for server-side operations only.

// Check if the app is already initialized to prevent errors in hot-reloading environments.
if (!admin.apps.length) {
  try {
    // Explicitly configure with the correct storage bucket to match the client config.
    // This is the definitive fix for server-side file access errors (500 Internal Server Error).
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
