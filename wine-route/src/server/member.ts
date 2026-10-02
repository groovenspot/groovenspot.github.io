import type { User } from "@prisma/client";
import { getUser } from "./auth";

/** 커뮤니티에 글을 쓰려면: 로그인 → 성인인증 → 닉네임 */
export type MemberState = { user: User | null; ok: boolean; need: "login" | "adult" | "nickname" | null };

export async function memberState(): Promise<MemberState> {
  const user = await getUser();
  if (!user) return { user, ok: false, need: "login" };
  if (!user.adultVerifiedAt) return { user, ok: false, need: "adult" };
  if (!user.nickname) return { user, ok: false, need: "nickname" };
  return { user, ok: true, need: null };
}
