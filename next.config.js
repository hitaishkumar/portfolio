/** @type {import('next').NextConfig} */

// Set STATIC_EXPORT=true (e.g. for GitHub Pages) to produce a fully static `out/` dir.
const isStaticExport = process.env.STATIC_EXPORT === "true";
// When hosting under user.github.io/<repo>, set BASE_PATH="/<repo>" so routes
// AND static assets (/_next/...) are prefixed correctly.
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        images: { unoptimized: true },
        basePath,
        assetPrefix: basePath || undefined,
      }
    : {}),
};

module.exports = nextConfig;
