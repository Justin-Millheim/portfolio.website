/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Allow the /program service worker to claim the /program scope even
        // though the script itself lives under /program/. This keeps the SW
        // strictly scoped to The Block — it can never control the rest of the
        // portfolio site.
        source: "/program/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/program" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
