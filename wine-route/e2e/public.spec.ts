import { expect, test } from "./fixtures";

test.describe("둘러보기", () => {
  test("첫 화면 → 검색 → 와인 상세", async ({ page, pageErrors }) => {
    void pageErrors;
    await page.goto("/");
    await expect(page.locator(".card").first()).toBeVisible();
    await page.locator("#q").fill("샤블리");
    await page.locator("#q").press("Enter");
    await expect(page).toHaveURL(/q=/);
    const first = page.locator("a.card:not(.recent)").first();
    await expect(first).toContainText("샤블리");
    await first.click();
    await expect(page).toHaveURL(/\/wines\//);
    await expect(page.locator(".wine-head h1")).toContainText("샤블리");
    await expect(page.locator(".routes").first()).toBeVisible();
    await expect(page.locator("figure.thumb.lg")).toBeVisible();
  });

  test("필터·페이지 이동이 주소에 남습니다", async ({ page, pageErrors }) => {
    void pageErrors;
    await page.goto("/?type=" + encodeURIComponent("레드"));
    const cards = page.locator("a.card .sub").filter({ hasText: "·" });
    await expect(cards.first()).toContainText("레드");
    const pager = page.getByRole("navigation", { name: "페이지" });
    if (await pager.count()) {
      await pager.getByRole("link").last().click();
      await expect(page).toHaveURL(/page=/);
      await expect(page.locator("a.card:not(.recent)").first()).toBeVisible();
    }
  });

  test("비교함에 담아 나란히 봅니다", async ({ page, pageErrors }) => {
    void pageErrors;
    await page.goto("/");
    const names: string[] = [];
    for (const i of [0, 1]) {
      await page.goto("/");
      const card = page.locator("a.card:not(.recent)").nth(i);
      names.push((await card.locator(".name").innerText()).trim());
      await card.click();
      await page.getByRole("button", { name: "비교에 담기" }).click();
      await page.waitForLoadState("networkidle");
    }
    await page.goto("/compare");
    for (const n of names) await expect(page.locator("table.compare")).toContainText(n);
    await page.getByRole("button", { name: "비교함 비우기" }).click();
    await expect(page.locator("table.compare")).toHaveCount(0);
  });

  test("합배송 견적", async ({ page, pageErrors }) => {
    void pageErrors;
    await page.goto("/consolidate");
    const opts = page.locator("#f option:not([disabled])");
    test.skip((await opts.count()) === 0, "배송대행지 시드 없음");
    await page.locator("#f").selectOption(await opts.first().getAttribute("value") as string);
    await page.getByRole("button", { name: "와인 고르기" }).click();
    const qty = page.locator("input[type=number][name^=q_]");
    await expect(qty.first()).toBeVisible();
    await qty.first().fill("2");
    if ((await qty.count()) > 1) await qty.nth(1).fill("1");
    await page.getByRole("button", { name: "견적 보기" }).click();
    await expect(page.getByText("운임 합계")).toBeVisible();
  });

  test("없는 주소는 404, 상태 확인 주소는 정상", async ({ page, request, pageErrors }) => {
    void pageErrors;
    const res = await page.goto("/no-such-page-e2e");
    expect(res?.status()).toBe(404);
    await expect(page.locator(".oops")).toBeVisible();
    const h = await request.get("/api/health");
    expect(h.ok()).toBe(true);
    expect(await h.json()).toMatchObject({ ok: true });
  });
});
