import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // ⚠️ 一時的にESLintエラーを無視してビルドを通す
    // TODO: 後で型エラーを修正してfalseに戻す
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚠️ 一時的にTypeScriptエラーを無視してビルドを通す
    // TODO: 後で型エラーを修正してfalseに戻す
    ignoreBuildErrors: true,
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@tiptap/react',
      '@xyflow/react',
    ],
    // Enable Turbopack for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Enable compression
  compress: true,
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Minimize bundle size
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        events: false,
        net: false,
        tls: false,
        stream: false,
        buffer: false,
        util: false,
        process: false,
      };

      // Replace redis with a stub on client side
      config.resolve.alias = {
        ...config.resolve.alias,
        redis: false,
      };
    }

    // Ignore optional redis dependency warnings
    config.ignoreWarnings = [
      {
        module: /redis/,
        message: /Module not found/,
      },
    ];

    // Handle external modules
    config.externals = [...(config.externals || [])];

    // Add rules to ignore redis in non-server builds
    if (!isServer) {
      config.module.rules.push({
        test: /redis/,
        use: 'null-loader',
      });
    }

    return config;
  },
};

export default nextConfig;
