import { randomUUID } from "node:crypto";
import { expect, loginAs, prisma, test } from "./fixtures";

const email = `e2e-member-${randomUUID().slice(0, 8)}@example.test`;

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
});

test("회원: 찜 알림 등록 → 내 정보에서 확인, 브라우저 알림 영역", async ({ page, context, baseURL, pageErrors }) => {
  void pageErrors;
  await loginAs(context, email, baseURL!);
  await context.grantPermissions(["notifications"]);
  await page.goto("/");
  await page.locator("a.card:not(.recent)").first().click();
  const name = (await page.locator(".wine-head h1").innerText()).trim();
  await page.locator("#al-target").fill("50000");
  await page.getByRole("button", { name: "찜하고 알림 받기" }).click();
  await expect(page.locator("form p.pos").first()).toBeVisible();

  await page.goto("/me");
  await expect(page.locator("#watch")).toContainText(name);
  const push = page.locator("#push");
  await expect(push.getByRole("heading", { name: "브라우저 알림" })).toBeVisible();
  if (process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
    // 헤드리스 셸은 허용해도 알림을 '거부'로 보고하므로 두 상태 중 하나가 보이면 됩니다
    await expect(push.getByRole("button", { name: "이 기기에서 알림 받기" }).or(push.getByText("알림이 막혀 있습니다"))).toBeVisible();
  } else {
    await expect(push).toContainText("준비 중");
  }
  await expect(page.locator("#inbox")).toBeVisible();
});

test("비회원은 내 정보에서 로그인 화면으로", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login/);
});
