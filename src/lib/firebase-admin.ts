
import * as admin from 'firebase-admin';

// This configuration uses the correct storage bucket name as requested.
const firebaseAdminConfig = {
  projectId: 'hssetech-e1710',
  storageBucket: 'hssetech-e1710.firebasestorage.app',
};

// Initialize the Firebase Admin SDK.
// This is safe to run in a server environment and will only initialize once.
if (!admin.apps.length) {
  admin.initializeApp(firebaseAdminConfig);
}

// Export the initialized admin services.
const storage = admin.storage();
export { storage };
