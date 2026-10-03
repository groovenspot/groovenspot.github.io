"use client";

import { useEffect } from "react";
import { RECENT_COOKIE, RECENT_MAX, parseIds, pushRecent } from "@/lib/wineList";

/**
 * 최근 본 와인: 화면이 실제로 열렸을 때만 이 브라우저의 쿠키에 남깁니다 (서버에 저장하지 않음).
 * 미들웨어로 하면 링크 미리 불러오기(prefetch)까지 '본 것'으로 셉니다.
 */
export function RecentViewMark({ wineId }: { wineId: string }) {
  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find((c) => c.startsWith(`${RECENT_COOKIE}=`))?.slice(RECENT_COOKIE.length + 1);
      const next = pushRecent(parseIds(raw ? decodeURIComponent(raw) : null, RECENT_MAX), wineId);
      document.cookie = `${RECENT_COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=${90 * 86400}; samesite=lax`;
    } catch {
      // 쿠키를 막은 브라우저는 기록 없이 지나갑니다.
    }
  }, [wineId]);
  return null;
}
