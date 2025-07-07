
/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
           {
              key: 'Access-Control-Allow-Credentials',
              value: 'true',
            },
            {
              key: 'Access-Control-Allow-Origin',
              value: '*',
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, baggage, sentry-trace',
            },
            {
              key: 'Content-Security-Policy',
              value: "frame-ancestors *",
            },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@google-cloud/firestore',
      '@opentelemetry/sdk-node',
      '@opentelemetry/exporter-jaeger',
      'firebase-admin',
      'handlebars',
      'dotprompt'
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
   webpack: (
    config,
    { isServer }
  ) => {
    // This is the definitive fix for the client-side build error.
    // It tells webpack to replace these server-only modules with `false`
    // when building for the client, preventing "module not found" errors.
    if (!isServer) {
      config.resolve.alias['@google-cloud/firestore'] = false;
      config.resolve.alias['@opentelemetry/exporter-jaeger'] = false;
      config.resolve.alias['@opentelemetry/sdk-node'] = false;
      config.resolve.alias['genkit'] = false;
      config.resolve.alias['@genkit-ai/googleai'] = false;
      config.resolve.alias['@genkit-ai/core'] = false;
      config.resolve.alias['firebase-admin'] = false;
    }
    return config
  }
};

module.exports = nextConfig;
