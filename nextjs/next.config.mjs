/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: function (config, options) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
  output: "standalone",
  async redirects() {
    return [
      {
        source: '/',
        destination: '/front',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
