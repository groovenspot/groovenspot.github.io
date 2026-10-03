import { defineConfig, devices } from "@playwright/test";

// .env 를 읽습니다 (이미 있는 환경변수는 덮어쓰지 않음). CI 에서는 워크플로 env 를 씁니다.
try { process.loadEnvFile(".env"); } catch { /* .env 없음 */ }

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * 브라우저 E2E: `npm run build` 후 `npm run test:e2e`.
 * 서버가 이미 떠 있으면 그대로 쓰고, 없으면 `npm start` 로 띄웁니다. DB 는 마이그레이션·시드가 끝난 상태여야 합니다.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: {
    command: "npm start",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
  },
});
