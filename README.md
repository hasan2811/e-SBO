# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Backend Architecture: Direct Client-Side Uploads

This application uses a modern architecture where the web client uploads files **directly** to Firebase Storage. This is efficient and fast. Because of this design, this project **does not use Cloud Functions** for handling file uploads. The backend logic is handled entirely by Firebase Storage Security Rules and Firestore Security Rules.

### Applying CORS Rules for Firebase Storage

To allow your web application to upload files directly to Firebase Storage, you must apply a CORS (Cross-Origin Resource Sharing) configuration to your storage bucket. The configuration is defined in the `cors.json` file.

**This is a required step.** The `firebase deploy` command does not apply these settings. You must run the following command from your project's root directory to apply the settings. This command uses the `gsutil` tool, which interacts directly with Google Cloud Storage.

Run this command in your terminal:

```bash
gsutil cors set cors.json gs://hssetech-e1710.firebasestorage.app
```

This command uses the `gsutil` tool to set the policy defined in `cors.json` on the correct Cloud Storage bucket for this project (`hssetech-e1710.firebasestorage.app`). This step is necessary to fix any CORS-related upload errors from the browser.
