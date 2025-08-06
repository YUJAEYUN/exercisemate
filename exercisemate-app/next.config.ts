import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Admin을 서버 외부 패키지로 설정
  serverExternalPackages: ['firebase-admin'],

  // TypeScript 설정
  typescript: {
    // Functions 폴더의 TypeScript 에러 무시
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
