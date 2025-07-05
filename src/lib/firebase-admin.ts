
import * as admin from 'firebase-admin';

// This file is for server-side operations only.

// Check if the app is already initialized to prevent errors in hot-reloading environments.
if (!admin.apps.length) {
  try {
    // In a managed Google Cloud environment (like App Hosting or Cloud Functions),
    // calling initializeApp() with no arguments allows the SDK to automatically
    // discover service account credentials and project details. This is the
    // most robust method for these environments and resolves token refresh issues.
    admin.initializeApp();
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
}

// Export the admin services to be used in server actions.
const adminDb = admin.firestore();
const adminStorage = admin.storage();

export { adminDb, adminStorage };
