/**
 * Two ways to build:
 *   npm run build         a normal Next.js build (Vercel or `next start`), with the optional /api/extract route
 *   npm run build:pages   a fully static site in out/ for GitHub Pages or any static host
 * Set NEXT_PUBLIC_BASE_PATH (for example "/saath") when the site lives in a sub-folder.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isStatic = process.env.SAATH_STATIC === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
  ...(isStatic
    ? { output: "export", trailingSlash: true }
    : {
        async headers() {
          return [
            {
              source: "/sw.js",
              headers: [
                { key: "Cache-Control", value: "no-cache" },
                { key: "Service-Worker-Allowed", value: "/" },
              ],
            },
            {
              source: "/tessdata/:path*",
              headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
            },
            {
              source: "/tesseract/:path*",
              headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
            },
          ];
        },
      }),
};

module.exports = nextConfig;
