import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads its worker as a separate chunk at
  // runtime; bundling it breaks that resolution, so keep it external.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
