import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** 개인통관고유부호 같은 민감 정보를 AES-256-GCM으로 암호화해 저장합니다. 키: ORDER_DATA_KEY (없으면 SESSION_SECRET) */
const key = () => {
  const configured = process.env.ORDER_DATA_KEY?.trim() || process.env.SESSION_SECRET?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("order_data_key_not_configured");
  return createHash("sha256").update(configured || "dev-secret").digest();
};

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${body.toString("base64url")}`;
}

export function decrypt(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const [v, iv, tag, body] = token.split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
