import { test as base, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

export const prisma = new PrismaClient();

// src/server/auth.ts 와 같은 방식으로 세션을 만듭니다 (로그인 메일 없이 바로 로그인)
const hash = (v: string) => createHash("sha256").update(`${process.env.SESSION_SECRET ?? "dev-secret"}:${v}`).digest("hex");
export const adminEmail = () => (process.env.ADMIN_EMAILS ?? "admin@example.com").split(",")[0].trim().toLowerCase();

export async function loginAs(context: BrowserContext, email: string, baseURL: string) {
  const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { id: hash(token), userId: user.id, expiresAt: new Date(Date.now() + 86400e3) } });
  await context.addCookies([{ name: "wr_session", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
  return user;
}

/** 외부 글꼴 요청은 끊어 둡니다 (네트워크 없는 CI·샌드박스에서 페이지 로딩이 늦어지지 않게). 화면 오류는 모아서 검사합니다. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await use(errors);
    expect(errors, "브라우저 스크립트 오류").toEqual([]);
  },
});
export { expect };

/** 1x1 PNG (병 사진 자리 확인용) */
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
