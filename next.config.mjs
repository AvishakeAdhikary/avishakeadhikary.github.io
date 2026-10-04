/**
 * Static export for GitHub Pages.
 *
 * Images go through a custom loader (src/lib/image-loader.ts) that maps
 * `next/image` requests onto the pre-generated WebP variants produced by
 * `npm run media:optimize`. The widths below MUST stay in sync with
 * IMAGE_WIDTHS in scripts/optimize-media.mjs.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    imageSizes: [128, 256],
    deviceSizes: [480, 960, 1600, 2400],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
