import { NextResponse, type NextRequest } from "next/server";
import { JOBS, runJob, type JobName } from "@/jobs/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 스케줄러(Vercel Cron, GitHub Actions 등)가 호출합니다. Authorization: Bearer <CRON_SECRET> */
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(job in JOBS)) return NextResponse.json({ error: "unknown job" }, { status: 404 });
  const r = await runJob(job as JobName);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
