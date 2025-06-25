import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK.
// This is safe to run in a server environment and will only initialize once.
if (!admin.apps.length) {
  admin.initializeApp({
    // Using hardcoded values to ensure consistency and avoid environment variable issues.
    projectId: 'hssetech-e1710',
    storageBucket: 'hssetech-e1710.appspot.com',
  });
}

// Export the initialized admin services.
const storage = admin.storage();
export { storage };
