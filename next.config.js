/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
   webpack: (
    config,
    { isServer }
  ) => {
    // Aliasing to fix client-side bundling issues with server-only packages
    if (!isServer) {
      config.resolve.alias['@opentelemetry/exporter-jaeger'] = false;
      config.resolve.alias['@opentelemetry/sdk-node'] = false;
    }
    return config
  }
};

module.exports = nextConfig;
