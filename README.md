# HSSETech Observation Platform

This is a Next.js application for logging and analyzing Health, Safety, Security, and Environment (HSSE) observations.

## Getting Started

### 1. Environment Variables

This project requires environment variables to connect to Firebase services and Google AI.

-   Copy the `.env.example` file to a new file named `.env.local`.
-   Fill in the required values in `.env.local`. **This file contains secret keys and should NOT be committed to Git.**

```bash
cp .env.example .env.local
```

For production deployment (e.g., on Vercel, Netlify), set these environment variables directly in your hosting provider's dashboard.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Required Setup: Firebase Storage CORS

For file uploads to work, you must configure Cross-Origin Resource Sharing (CORS) on your Firebase Storage bucket. This is a **one-time setup**.

Run the following command in your terminal, ensuring you have the `gcloud` CLI installed and authenticated:

```bash
gsutil cors set cors.json gs://hssetech-e1710.firebasestorage.app
```

This command allows the web app to upload files directly to your storage bucket.
