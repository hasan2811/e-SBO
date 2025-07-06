
/** @type {import('next').NextConfig} */

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: ({ request }) => {
        return request.destination === 'style' || request.destination === 'script' || request.destination === 'worker';
      },
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: ({ request }) => {
        return request.destination === 'image';
      },
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://apis.google.com https://www.gstatic.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https://placehold.co https://lh3.googleusercontent.com https://firebasestorage.googleapis.com;
    connect-src 'self' https://*.googleapis.com wss://*.firebaseio.com https://firebasestorage.googleapis.com https://www.google-analytics.com;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    frame-src 'self' https://hssetech-e1710.firebaseapp.com;
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer-when-downgrade',
  },
];


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
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@google-cloud/firestore',
      '@opentelemetry/sdk-node',
      '@opentelemetry/exporter-jaeger',
      'firebase-admin'
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

module.exports = withPWA(nextConfig);
