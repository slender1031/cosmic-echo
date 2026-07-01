import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },

  // Bundle optimization: tree-shake large libraries (framer-motion, i18next, etc.)
  // so only the actually-used exports are included in client bundles.
  optimizePackageImports: [
    "framer-motion",
    "i18next",
    "react-i18next",
    "lucide-react",
    "@base-ui/react",
    "sonner",
  ],

  // Allowed dev origins for local development over Wi-Fi
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ],

  webpack: (config, { nextRuntime, isServer }) => {
    console.log(
      `[next.config.ts webpack] nextRuntime=${nextRuntime}, isServer=${isServer}`
    );

    const webpack = require("webpack");

    // ── Edge build: stub out Node.js-only packages ──────────────────────
    // drizzle-orm/pg-core → pg-core-stub.ts (mock pgTable/text/etc.)
    const pgCoreStub = path.join(__dirname, "src/lib/db/pg-core-stub.ts");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /drizzle-orm[/\\]pg-core$/,
        pgCoreStub
      )
    );

    // postgres (net/tls) → empty stub
    const emptyStub = path.join(__dirname, "src/lib/db/empty-stub.cjs");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^postgres$/, emptyStub)
    );

    // drizzle-orm/* that transitively depends on pg-core
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /drizzle-orm[/\\](postgres-js|node-postgres|better-sqlite3|bun-sqlite|neon-serverless)$/,
        emptyStub
      )
    );

    // Secondary safety-net aliases
    config.resolve.alias["drizzle-orm/pg-core"] = pgCoreStub;
    config.resolve.alias["postgres"] = emptyStub;
    config.resolve.alias["drizzle-orm"] = emptyStub;
    config.resolve.alias["drizzle-orm/postgres-js"] = emptyStub;

    // ── Bundle splitting: merge small chunks to reduce HTTP requests ─────
    // Default Next.js splits per-route, which creates many tiny <5 KB chunks.
    // Merging them into fewer ~50 KB chunks dramatically reduces latency on
    // high-RTT connections (e.g. cross-continent to Cloudflare PoP).
    if (!isServer) {
      config.optimization.splitChunks = {
        ...(config.optimization.splitChunks || {}),
        cacheGroups: {
          // Vendor libs that change infrequently → long-term cache
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
            maxSize: 250000, // ~250 KB per vendor chunk
          },
          // Framer-motion is large (~150 KB) → separate chunk, cached independently
          framer: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: "framer-motion",
            chunks: "all",
            priority: 20,
          },
          // i18next + react-i18next
          i18n: {
            test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
            name: "i18n",
            chunks: "all",
            priority: 20,
          },
          // Common app code
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 5,
            minSize: 20000,   // merge chunks >20 KB
            maxSize: 100000,   // ~100 KB per common chunk
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
