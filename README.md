# HSSETech Observation Platform

This is a Next.js application for logging and analyzing Health, Safety, Security, and Environment (HSSE) observations.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Note**: All necessary API keys and Firebase configurations have been directly embedded into the application code to ensure functionality in the target deployment environment.

## Required Setup: Firebase Storage CORS

For file uploads to work, you must configure Cross-Origin Resource Sharing (CORS) on your Firebase Storage bucket. This is a **one-time setup**.

Run the following command in your terminal, ensuring you have the `gcloud` CLI installed and authenticated:

```bash
gsutil cors set cors.json gs://hssetech-e1710.firebasestorage.app
```

This command allows the web app to upload files directly to your storage bucket.
