/** @type {import('next').NextConfig} */

// Set STATIC_EXPORT=true (e.g. for GitHub Pages) to produce a fully static `out/` dir.
const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        images: { unoptimized: true },
        // Set BASE_PATH to your repo name when hosting at user.github.io/<repo>
        basePath: process.env.BASE_PATH || "",
      }
    : {}),
};

module.exports = nextConfig;
