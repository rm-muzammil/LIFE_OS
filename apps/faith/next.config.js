const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.alquran\.cloud\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "quran-api-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 * 30 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-cache",
        expiration: { maxEntries: 200 },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);