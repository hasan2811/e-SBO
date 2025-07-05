
import * as admin from 'firebase-admin';

// This file is for server-side operations only.

// Check if the app is already initialized to prevent errors in hot-reloading environments.
if (!admin.apps.length) {
  try {
    // Use the default initialization; it's more robust in Google Cloud environments.
    admin.initializeApp();
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
}

// Export the admin services to be used in server actions.
const adminDb = admin.firestore();
// Explicitly get the default bucket instance to ensure correct access and prevent module resolution issues.
const adminStorage = admin.storage().bucket('hssetech-e1710.firebasestorage.app');

export { adminDb, adminStorage };
