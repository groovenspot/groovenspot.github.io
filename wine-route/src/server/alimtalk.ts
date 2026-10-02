import { createHmac, randomBytes } from "node:crypto";

/**
 * 카카오 알림톡 (Solapi). 템플릿은 카카오 비즈니스 채널에서 사전 승인이 필요합니다.
 * 가격 알림 템플릿 변수: #{와인}, #{도착가}, #{목표가}, #{링크}
 * 주문 상태 템플릿 변수: #{와인}, #{상태}, #{판매처}, #{링크}
 */
const base = () => !!(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SOLAPI_PFID);

export function alimtalkConfigured(template: "price" | "order" = "price") {
  return base() && !!(template === "price" ? process.env.SOLAPI_TEMPLATE_PRICE_ALERT : process.env.SOLAPI_TEMPLATE_ORDER_STATUS);
}

export function solapiAuthHeader(apiKey: string, secret: string, date = new Date().toISOString(), salt = randomBytes(16).toString("hex")) {
  const signature = createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function send(to: string, templateId: string, variables: Record<string, string>) {
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      Authorization: solapiAuthHeader(process.env.SOLAPI_API_KEY!, process.env.SOLAPI_API_SECRET!),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        to: to.replace(/\D/g, ""),
        from: process.env.SOLAPI_SENDER,
        kakaoOptions: { pfId: process.env.SOLAPI_PFID, templateId, variables },
      },
    }),
  });
  if (!res.ok) throw new Error(`알림톡 발송 실패 ${res.status}: ${await res.text()}`);
}

export function sendPriceAlimtalk(to: string, v: { wine: string; price: string; target: string; link: string }) {
  return send(to, process.env.SOLAPI_TEMPLATE_PRICE_ALERT!, { "#{와인}": v.wine, "#{도착가}": v.price, "#{목표가}": v.target, "#{링크}": v.link });
}

export function sendOrderAlimtalk(to: string, v: { wine: string; status: string; seller: string; link: string }) {
  return send(to, process.env.SOLAPI_TEMPLATE_ORDER_STATUS!, { "#{와인}": v.wine, "#{상태}": v.status, "#{판매처}": v.seller, "#{링크}": v.link });
}
