import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: configDir,
  },
  async redirects() {
    return [
      {
        source: "/rankings",
        destination: "/arena",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
