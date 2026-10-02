import { createHmac, randomBytes } from "node:crypto";

/**
 * 카카오 알림톡 (Solapi). 템플릿은 카카오 비즈니스 채널에서 사전 승인이 필요합니다.
 * 템플릿 변수: #{와인}, #{도착가}, #{목표가}, #{링크}
 */
export function alimtalkConfigured() {
  return !!(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SOLAPI_PFID && process.env.SOLAPI_TEMPLATE_PRICE_ALERT);
}

export function solapiAuthHeader(apiKey: string, secret: string, date = new Date().toISOString(), salt = randomBytes(16).toString("hex")) {
  const signature = createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function sendPriceAlimtalk(to: string, vars: { wine: string; price: string; target: string; link: string }) {
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
        kakaoOptions: {
          pfId: process.env.SOLAPI_PFID,
          templateId: process.env.SOLAPI_TEMPLATE_PRICE_ALERT,
          variables: { "#{와인}": vars.wine, "#{도착가}": vars.price, "#{목표가}": vars.target, "#{링크}": vars.link },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`알림톡 발송 실패 ${res.status}: ${await res.text()}`);
}
