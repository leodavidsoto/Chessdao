const nextConfig = {
  // Use 'export' for mobile builds, 'standalone' for server deployment
  output: process.env.NEXT_OUTPUT === 'export' ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  // Trailing slash needed for static export to work properly
  trailingSlash: process.env.NEXT_OUTPUT === 'export',
  // Allow dev origins for mobile testing
  allowedDevOrigins: ['192.168.1.90', 'localhost', '127.0.0.1'],
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  webpack(config, { dev, isServer }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      };
    }

    // Fix for Solana wallet adapter and other web3 packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };

      // Fix for pino-pretty issue with Solana wallets
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': false,
      };
    }

    // Ignore certain warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
    ];

    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  // CORS is handled dynamically in middleware.js (origin allowlist) because a
  // static wildcard `Access-Control-Allow-Origin: *` let any website call this
  // API on a logged-in user's behalf. Configure allowed origins via the
  // ALLOWED_ORIGINS environment variable.
};

module.exports = nextConfig;
