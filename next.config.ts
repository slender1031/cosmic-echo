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
  webpack: (config, { nextRuntime }) => {
    // Edge Runtime builds: replace Node.js-only packages with empty stubs.
    // postgres and drizzle-orm use net/tls which don't exist in Edge.
    if (nextRuntime === "edge") {
      const stub = path.join(__dirname, "src/lib/db/empty-stub.cjs");
      const pgStubPaths = [
        "postgres",
        "drizzle-orm",
        "drizzle-orm/postgres-js",
        "drizzle-orm/pg-core",
        "drizzle-orm/mysql-core",
        "drizzle-orm/sqlite-core",
        "drizzle-orm/better-sqlite3",
        "drizzle-orm/bun-sqlite",
        "drizzle-orm/neon-serverless",
        "drizzle-orm/singlestore",
        "drizzle-orm/vercel-postgres",
        "drizzle-orm/xata",
        "drizzle-orm/lib",
        "drizzle-orm/crosspostgres",
        "drizzle-orm/pg-protocol",
        "drizzle-orm/pg-vector",
      ];
      for (const pkg of pgStubPaths) {
        config.resolve.alias[pkg] = stub;
      }
    }
    return config;
  },
};

export default nextConfig;
