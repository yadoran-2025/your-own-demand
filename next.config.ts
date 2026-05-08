import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProduction ? "/your-own-demand" : "",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
