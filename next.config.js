
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


// Define a robust Content Security Policy
const ContentSecurityPolicy = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googleapis.com *.googletagmanager.com;
    style-src 'self' 'unsafe-inline' fonts.googleapis.com;
    img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://placehold.co;
    font-src 'self' fonts.gstatic.com;
    connect-src 'self' *.firebaseio.com *.googleapis.com wss://*.firebaseio.com;
    frame-src 'self' https://*.firebaseapp.com;
    frame-ancestors 'self' https://*.cloudworkstations.dev;
`.replace(/\s{2,}/g, ' ').trim();

// Define security headers. HSTS is applied only in production.
const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: ContentSecurityPolicy,
    },
    {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
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
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
    },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
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
  // Apply security headers
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

module.exports = withPWA(nextConfig);
