
'use server';

import * as admin from 'firebase-admin';

// This file is for server-side operations only.

// Check if the app is already initialized to prevent errors in hot-reloading environments.
if (!admin.apps.length) {
  try {
    // By calling initializeApp() with no arguments, the Admin SDK can automatically
    // discover the correct credentials and configuration from the App Hosting environment.
    // This is the most robust and recommended method for production.
    admin.initializeApp();
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
}

// Export the admin services to be used in server actions.
const adminDb = admin.firestore();
const adminStorage = admin.storage();

export { adminDb, adminStorage };
