import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

// Allow localhost admin API images during development
remotePatterns.push({ protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" });

// Allow Vercel Blob public URLs (account subdomains)
remotePatterns.push({ protocol: "https", hostname: "**.public.blob.vercel-storage.com", pathname: "/**" });
remotePatterns.push({ protocol: "https", hostname: "**.blob.vercel-storage.com", pathname: "/**" });

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
