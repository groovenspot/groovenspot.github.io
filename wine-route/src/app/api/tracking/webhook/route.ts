import { NextResponse, type NextRequest } from "next/server";
import { applyTrackingUpdate, readTrackingBody, verifyTrackingSignature } from "@/server/tracking";
import { trackingPayloadSchema } from "@/lib/tracking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.TRACKING_WEBHOOK_SECRET) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  let raw: string;
  try { raw = await readTrackingBody(req); }
  catch { return NextResponse.json({ error: "invalid_body" }, { status: 413 }); }
  if (!verifyTrackingSignature(raw, req.headers.get("x-tracking-timestamp"), req.headers.get("x-tracking-signature"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let input: unknown;
  try { input = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "invalid_response" }, { status: 400 }); }
  const payload = trackingPayloadSchema.safeParse(input);
  if (!payload.success) return NextResponse.json({ error: "invalid_response" }, { status: 400 });
  try {
    const result = await applyTrackingUpdate(payload.data.orderId, payload.data, "webhook");
    const status = result.ok ? 200 : result.error === "not_found" ? 404 : result.error === "identity_mismatch" ? 409 : 400;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
  }
}
