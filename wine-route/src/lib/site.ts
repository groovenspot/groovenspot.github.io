/** 절대 주소가 필요한 곳(sitemap, 공유 미리보기)에서 씁니다. 끝의 / 는 뗍니다. */
export const siteUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** 검색엔진이 긁지 않을 경로. 로그인·개인 화면, 이동·기록용 주소, 관리자 */
export const PRIVATE_PATHS = ["/admin", "/api", "/me", "/go", "/order", "/login", "/logout", "/r/", "/n/", "/tracking", "/verify", "/share", "/consultation", "/community/write"];
