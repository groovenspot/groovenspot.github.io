import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // 후기 인증 사진 업로드 (최대 8MB)
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
};

export default nextConfig;
