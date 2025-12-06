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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve("buffer"),
        crypto: require.resolve("crypto-browserify"),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
