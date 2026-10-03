import { runConsultationCleanup } from "./consultation";
import { prisma } from "@/server/db";
import { runFxJob } from "./fx";
import { runCrawlJob } from "./crawl";
import { notifyFxLows, runAlertsJob } from "./alerts";
import { sendDigests } from "@/server/notify";
import { runTrackingJob } from "./tracking";

export const JOBS = {
  "consultation-cleanup": () => runConsultationCleanup(),
  fx: async () => [await runFxJob(), await notifyFxLows()].filter(Boolean).join(" · "),
  crawl: () => runCrawlJob(),
  alerts: () => runAlertsJob(),
  digest: () => sendDigests(),
  tracking: () => runTrackingJob(),
} as const;
export type JobName = keyof typeof JOBS;

export async function runJob(name: JobName) {
  try {
    const message = await JOBS[name]();
    await prisma.jobLog.create({ data: { job: name, ok: true, message } });
    return { ok: true, message };
  } catch (e) {
    const message = (e as Error).message;
    await prisma.jobLog.create({ data: { job: name, ok: false, message } });
    return { ok: false, message };
  }
}
