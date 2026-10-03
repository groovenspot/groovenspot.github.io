/**
 * 공개 둘러보기 데모 (DEMO_MODE=1): 예시 데이터 표시, 로그인·출시 알림 등록을 막습니다.
 * 운영에서는 비워 둡니다.
 */
export const isDemo = () => process.env.DEMO_MODE === "1";
export const DEMO_BLOCKED = "둘러보기 데모에서는 로그인과 등록을 쓸 수 없습니다. 와인 찾기·비교·계산은 그대로 써 볼 수 있습니다.";
