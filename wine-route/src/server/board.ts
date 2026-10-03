import { prisma } from "./db";
import { getCommunityConfig } from "./settings";
import { boardOpen } from "@/lib/community";

/** 자유게시판이 열렸는지와 그 근거(공개 후기 수·성인인증 회원 수) */
export async function boardStatus() {
  const cfg = await getCommunityConfig();
  const [published, members] = await Promise.all([
    prisma.directReview.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count({ where: { adultVerifiedAt: { not: null } } }),
  ]);
  return { open: boardOpen(cfg, published, members), published, members, cfg };
}

export const authorSelect = { select: { nickname: true, founding: true } } as const;
