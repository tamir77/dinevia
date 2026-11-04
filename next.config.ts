import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext applies this multipart limit before routing API uploads too.
  experimental: {serverActions: {bodySizeLimit: '25mb'}},
};

export default nextConfig;
