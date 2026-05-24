import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow LAN access for mobile testing (Next.js 16 dev security)
  allowedDevOrigins: [
    "192.168.8.19",
    "192.168.1.*",
    "192.168.0.*",
    "10.0.0.*",
  ],
};

export default nextConfig;
