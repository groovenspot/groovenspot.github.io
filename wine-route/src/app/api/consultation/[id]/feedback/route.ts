import { NextResponse } from "next/server";
import { getUser } from "@/server/auth";
import { consultationFeedbackSchema } from "@/lib/consultation";
import { ConsultationError, consultationFeedback, readConsultationBody } from "@/server/consultation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const user = await getUser();
    if (!user) throw new ConsultationError("login_required", 401, "로그인 후 상담을 이용해 주세요.");
    if (!user.adultVerifiedAt) throw new ConsultationError("adult_required", 403, "성인인증을 마친 회원만 상담을 이용할 수 있습니다.");
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new ConsultationError("not_found", 404, "상담 기록을 찾을 수 없습니다.");
    let json: unknown;
    try { json = JSON.parse(await readConsultationBody(request)); }
    catch (error) { if (error instanceof ConsultationError) throw error; throw new ConsultationError("invalid_body", 400, "평가 형식을 확인해 주세요."); }
    const feedback = consultationFeedbackSchema.safeParse(json);
    if (!feedback.success) throw new ConsultationError("invalid_body", 400, "평가 형식을 확인해 주세요.");
    return NextResponse.json(await consultationFeedback(user.id, id, feedback.data), { headers });
  } catch (error) {
    if (error instanceof ConsultationError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status, headers });
    return NextResponse.json({ error: "temporarily_unavailable", message: "평가를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 503, headers });
  }
}
