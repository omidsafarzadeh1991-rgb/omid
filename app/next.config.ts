import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ssh2 (used by ssh2-sftp-client for the offsite-backup SFTP destination)
  // ships non-JS assets that Turbopack's server bundler can't place in an
  // ESM chunk - opt it out of bundling and let Node's native require handle it.
  serverExternalPackages: ["ssh2", "ssh2-sftp-client"],
};

export default nextConfig;
