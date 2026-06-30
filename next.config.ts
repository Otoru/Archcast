import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is served from a repo subpath
// (https://otoru.github.io/Archcast), so basePath/assetPrefix come from an env
// var the Pages workflow sets; local dev/build stay at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
