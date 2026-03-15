import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel用ヘッダー: マイクアクセス許可 + セキュリティ
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Permissions-Policy",
          value: "microphone=(self)",
        },
      ],
    },
  ],
};

export default nextConfig;
