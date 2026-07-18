import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Rank and recruit artwork ships with the app. Serving it directly avoids
    // depending on a deployment-specific image optimizer binding.
    unoptimized: true,
  },
};

export default nextConfig;
