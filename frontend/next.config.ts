import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the production
  // Docker image can run `node server.js` without the full node_modules tree.
  output: "standalone",

  experimental: {
    // Client-side router cache. `dynamic` defaults to 0, which means every
    // return trip to an already-visited dynamic route re-requests its RSC
    // payload from the server — so tab-switching re-rendered and re-flashed a
    // skeleton even when nothing behind it had changed.
    //
    // 60s matches our fastest-moving source (the price task refreshes every
    // 5 min, trending every 10), so within a minute of back-and-forth the
    // browser reuses what it already has and the nav costs no network at all.
    // Anything genuinely live is still bounded by the fetch-level revalidate
    // windows in lib/api.ts.
    staleTimes: { dynamic: 60, static: 300 },
  },
};

export default nextConfig;
