/** 이메일 발송. RESEND_API_KEY가 없으면 서버 로그로 남깁니다(개발용). */
export async function sendMail(to: string, subject: string, text: string, headers?: Record<string, string>) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[mail:dev] to=${to}\nsubject=${subject}\n${text}\n`);
    return { ok: true, dev: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text, ...(headers ? { headers } : {}) }),
  });
  if (!res.ok) throw new Error(`메일 발송 실패 ${res.status}: ${await res.text()}`);
  return { ok: true, dev: false };
}
