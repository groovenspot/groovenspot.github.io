import { prisma } from "@/server/db";
import { runFxJob } from "./fx";
import { runCrawlJob } from "./crawl";
import { runAlertsJob } from "./alerts";

export const JOBS = { fx: () => runFxJob(), crawl: () => runCrawlJob(), alerts: () => runAlertsJob() } as const;
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
