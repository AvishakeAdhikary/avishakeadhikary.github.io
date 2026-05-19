/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "",
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
