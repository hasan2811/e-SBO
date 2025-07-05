
import * as admin from 'firebase-admin';

// This file is for server-side operations only.

// Check if the app is already initialized to prevent errors in hot-reloading environments.
if (!admin.apps.length) {
  try {
    // The Admin SDK requires the GCS bucket name, which ends in .appspot.com.
    // This is the definitive fix for the server-side authentication issues.
    admin.initializeApp({
        storageBucket: 'hssetech-e1710.appspot.com',
    });
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
}

// Export the admin services to be used in server actions.
const adminDb = admin.firestore();
const adminStorage = admin.storage();

export { adminDb, adminStorage };
