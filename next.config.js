/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Deploy tidak diblok oleh lint; lint dijalankan terpisah di CI.
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig;
