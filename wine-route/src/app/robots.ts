import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, siteUrl } from "@/lib/site";

// APP_URL 은 배포 환경마다 달라 빌드 때 고정하지 않습니다.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
