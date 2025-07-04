import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude DocuSign SDK from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
      
      // Exclude DocuSign SDK from client bundle
      config.externals = config.externals || [];
      config.externals.push('docusign-esign');
    }
    
    return config;
  },
  serverExternalPackages: ['docusign-esign'],
};

export default nextConfig;
