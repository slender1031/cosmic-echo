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
      config.resolve.alias["postgres"] = stub;
      config.resolve.alias["drizzle-orm"] = stub;
      config.resolve.alias["drizzle-orm/postgres-js"] = stub;
    }
    return config;
  },
};

export default nextConfig;
