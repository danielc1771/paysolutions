import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
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
