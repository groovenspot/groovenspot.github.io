import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { parsePriceKrw, parseVintage } from "@/lib/match";

/**
 * 라벨 사진 → 와인 후보. 사진은 메모리에서만 쓰고 저장하지 않습니다.
 * SCAN_PROVIDER: claude (기본, ANTHROPIC_API_KEY 필요) | google (GOOGLE_VISION_API_KEY 필요)
 */
export type Recognized = { query: string; producer: string | null; name: string; vintage: number | null; priceKrw: number | null };
export type Provider = "claude" | "google";

export function scanProvider(): Provider | null {
  const hasClaude = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const hasGoogle = !!process.env.GOOGLE_VISION_API_KEY;
  if (process.env.SCAN_PROVIDER === "google") return hasGoogle ? "google" : null;
  if (process.env.SCAN_PROVIDER === "claude") return hasClaude ? "claude" : null;
  return hasClaude ? "claude" : hasGoogle ? "google" : null;
}

const LabelSchema = z.object({
  wines: z.array(
    z.object({
      producer: z.string().nullable(),
      name: z.string(),
      vintage: z.number().int().nullable(),
      price_krw: z.number().int().nullable(),
    }),
  ),
});

const PROMPT = `This photo shows a wine label, a shop shelf tag, or a restaurant wine list. List each wine you can read.
For each wine give: producer (winery/domaine/château, as printed), name (cuvée, appellation, grape or vineyard as printed — not the producer again), vintage year if printed (null for NV or unreadable), and price_krw if a Korean won price for that wine is visible (digits only, null otherwise).
Copy names as printed in their original language; do not translate or guess wines that are not visible. If nothing is legible, return an empty list.`;

let client: Anthropic | null = null;

async function viaClaude(image: Uint8Array, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<Recognized[]> {
  client ??= new Anthropic();
  const res = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(LabelSchema) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: Buffer.from(image).toString("base64") } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("이 사진은 인식할 수 없습니다");
  const out = res.parsed_output;
  if (!out) throw new Error("라벨을 읽지 못했습니다");
  return out.wines.slice(0, 8).map((w) => ({
    query: [w.producer, w.name, w.vintage].filter(Boolean).join(" "),
    producer: w.producer,
    name: w.name,
    vintage: w.vintage,
    priceKrw: w.price_krw && w.price_krw >= 5000 ? w.price_krw : null,
  }));
}

async function viaGoogle(image: Uint8Array): Promise<Recognized[]> {
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(process.env.GOOGLE_VISION_API_KEY!)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ image: { content: Buffer.from(image).toString("base64") }, features: [{ type: "TEXT_DETECTION" }] }] }),
  });
  if (!res.ok) throw new Error(`이미지 인식 API 오류 ${res.status}`);
  const j = (await res.json()) as { responses?: { fullTextAnnotation?: { text?: string } }[] };
  const text = j.responses?.[0]?.fullTextAnnotation?.text ?? "";
  return text.trim() ? [fromText(text)] : [];
}

/** 글자(직접 입력 또는 OCR 원문) 하나를 라벨 하나로 */
export function fromText(text: string): Recognized {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return { query: oneLine, producer: null, name: oneLine, vintage: parseVintage(oneLine), priceKrw: parsePriceKrw(text) };
}

export async function recognize(image: Uint8Array, mediaType: string): Promise<{ provider: Provider; items: Recognized[] }> {
  const p = scanProvider();
  if (!p) throw new Error("사진 인식이 설정되지 않았습니다. 라벨 글자를 직접 입력해 주세요.");
  if (p === "google") return { provider: p, items: await viaGoogle(image) };
  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) throw new Error("JPG·PNG·WEBP 사진만 인식할 수 있습니다");
  return { provider: p, items: await viaClaude(image, mediaType as "image/jpeg" | "image/png" | "image/webp") };
}
