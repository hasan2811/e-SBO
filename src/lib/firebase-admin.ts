
import * as admin from 'firebase-admin';

// In a Google Cloud environment like App Hosting, the SDK is automatically
// configured with the project's credentials. We don't need to pass any config.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export the initialized admin services.
const storage = admin.storage();
export { storage };
