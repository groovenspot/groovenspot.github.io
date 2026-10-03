import { NextResponse } from "next/server";
import { getUser } from "@/server/auth";
import { consultationInputSchema } from "@/lib/consultation";
import { ConsultationError, consultationHistory, createConsultation, readConsultationBody } from "@/server/consultation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

function failure(error: unknown) {
  if (error instanceof ConsultationError) return response({ error: error.code, message: error.message,
    ...(error.code === "daily_limit" ? { remaining: 0, isPremium: false } : {}) }, error.status);
  return response({ error: "temporarily_unavailable", message: "상담을 일시적으로 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요." }, 503);
}

async function authorizedUser() {
  const user = await getUser();
  if (!user) throw new ConsultationError("login_required", 401, "로그인 후 상담을 이용해 주세요.");
  if (!user.adultVerifiedAt) throw new ConsultationError("adult_required", 403, "성인인증을 마친 회원만 상담을 이용할 수 있습니다.");
  return user;
}

export async function GET() {
  try { return response(await consultationHistory(await authorizedUser())); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await authorizedUser();
    const raw = await readConsultationBody(request);
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return response({ error: "invalid_body", message: "질문 형식을 확인해 주세요." }, 400); }
    const input = consultationInputSchema.safeParse(json);
    if (!input.success) return response({ error: "invalid_body", message: "질문은 1,000자 이내로 입력하고 수량·용량을 확인해 주세요." }, 400);
    return response(await createConsultation(user.id, input.data));
  } catch (error) { return failure(error); }
}
