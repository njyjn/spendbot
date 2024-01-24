/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/spend",
  assetPrefix: "/spend",
  reactStrictMode: true,
  trailingSlash: false,
  i18n: {
    locales: ["en", "ru"],
    defaultLocale: "en",
  },
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
