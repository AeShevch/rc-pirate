/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.target = "electron-renderer";
      config.node = {
        __dirname: true,
      };
    }
    config.output.globalObject = "this";

    return config;
  },
};

module.exports = nextConfig;
