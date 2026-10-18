import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // falkordb (and its Temporal polyfill) must be required natively on the server, not bundled.
  serverExternalPackages: ["falkordb", "@js-temporal/polyfill", "@redis/client", "redis"],
};

export default nextConfig;
