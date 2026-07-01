import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
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

    // Stub for drizzle-orm/pg-core — replaces Node.js-only pg-core with a mock
    // that exports fake pgTable/text/varchar/etc. so schema files compile in Edge.
    const pgCoreStub = path.join(__dirname, "src/lib/db/pg-core-stub.ts");

    // NormalModuleReplacementPlugin is the most forceful way to redirect imports.
    // It runs during module resolution and replaces the matched module with our stub.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /drizzle-orm[/\\]pg-core$/,
        pgCoreStub
      )
    );

    // Also stub the postgres package (Node.js-only, uses net/tls)
    const emptyStub = path.join(__dirname, "src/lib/db/empty-stub.cjs");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^postgres$/,
        emptyStub
      )
    );

    // Also stub drizzle-orm/postgres-js (used by client.ts via lazy require)
    // and drizzle-orm/node-postgres — both depend on pg-core transitively
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /drizzle-orm[/\\](postgres-js|node-postgres|better-sqlite3|bun-sqlite|neon-serverless)$/,
        emptyStub
      )
    );

    // Keep alias as a secondary safety net
    config.resolve.alias["drizzle-orm/pg-core"] = pgCoreStub;
    config.resolve.alias["postgres"] = emptyStub;
    config.resolve.alias["drizzle-orm"] = emptyStub;
    config.resolve.alias["drizzle-orm/postgres-js"] = emptyStub;

    return config;
  },
};

export default nextConfig;
