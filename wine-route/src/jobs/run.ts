import { runConsultationCleanup } from "./consultation";
import { prisma } from "@/server/db";
import { sendMail } from "@/server/mail";
import { JOB_ALERT_STREAK, jobAlertKind } from "@/lib/jobAlert";
import { runFxJob } from "./fx";
import { runCrawlJob } from "./crawl";
import { notifyFxLows, runAlertsJob } from "./alerts";
import { sendDigests } from "@/server/notify";
import { runTrackingJob } from "./tracking";
import { runConsentNotices } from "./consent";

export const JOBS = {
  "consultation-cleanup": () => runConsultationCleanup(),
  fx: async () => [await runFxJob(), await notifyFxLows()].filter(Boolean).join(" · "),
  crawl: () => runCrawlJob(),
  alerts: () => runAlertsJob(),
  digest: () => sendDigests(),
  tracking: () => runTrackingJob(),
  "consent-notice": () => runConsentNotices(),
} as const;
export type JobName = keyof typeof JOBS;

export async function runJob(name: JobName) {
  let result: { ok: boolean; message: string };
  try {
    const message = await JOBS[name]();
    await prisma.jobLog.create({ data: { job: name, ok: true, message } });
    result = { ok: true, message };
  } catch (e) {
    const message = (e as Error).message;
    await prisma.jobLog.create({ data: { job: name, ok: false, message } });
    result = { ok: false, message };
  }
  await alertAdmins(name, result.message).catch((e) => console.error("job alert", e));
  return result;
}

/** 연속 실패가 기준에 닿으면 관리자에게 메일 (같은 연속 실패에는 한 번만), 복구되면 다시 한 번 */
async function alertAdmins(name: JobName, message: string) {
  const recent = await prisma.jobLog.findMany({ where: { job: name }, orderBy: { createdAt: "desc" }, take: 20, select: { ok: true } });
  const kind = jobAlertKind(recent.map((r) => r.ok));
  if (!kind) return;
  const to = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const subject = kind === "failing" ? `[셀러도어 운영] 정기 작업 '${name}' ${JOB_ALERT_STREAK}회 연속 실패` : `[셀러도어 운영] 정기 작업 '${name}' 복구`;
  const text = kind === "failing"
    ? `정기 작업 '${name}'이(가) ${JOB_ALERT_STREAK}번 연속 실패했습니다.\n마지막 오류: ${message}\n\n작업 기록: ${appUrl}/admin\n복구될 때까지 같은 알림은 다시 보내지 않습니다.`
    : `정기 작업 '${name}'이(가) 다시 성공했습니다.\n결과: ${message}`;
  for (const e of to) await sendMail(e, subject, text);
}
