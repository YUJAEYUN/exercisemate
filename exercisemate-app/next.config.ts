import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Functions 폴더를 Next.js 빌드에서 제외
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Functions 폴더를 감시에서 제외
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },

  // TypeScript 설정
  typescript: {
    // Functions 폴더의 TypeScript 에러 무시
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
