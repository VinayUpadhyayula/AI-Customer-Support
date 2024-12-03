/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental:{    
        serverComponentsExternalPackages: ['tesseract.js'],
    },
    webpack: config => {
      config.resolve.alias.canvas = false;
      config.resolve.alias.encoding = false;
      return config;
    },
};

export default nextConfig;