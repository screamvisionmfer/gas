import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/materials/*": ["./private/banners/**/*"],
    "/api/materials-preview/*": ["./private/banners/**/*"],
  },
};

export default nextConfig;
