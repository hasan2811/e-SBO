# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Backend Configuration

### Applying CORS Rules for Firebase Storage

To allow your web application to upload files directly to Firebase Storage, you must apply a CORS (Cross-Origin Resource Sharing) configuration to your storage bucket. The configuration is defined in the `cors.json` file.

Run the following command from your project's root directory to apply the settings:

```bash
gsutil cors set cors.json gs://hssetech-e1710.appspot.com
```

This command uses the `gsutil` tool to set the policy defined in `cors.json` on the correct Cloud Storage bucket for this project. This step is necessary to fix any CORS-related upload errors from the browser.
