import { JOBS, runJob, type JobName } from "./run";
import { prisma } from "@/server/db";

const name = process.argv[2] as JobName;
if (!(name in JOBS)) {
  console.error(`사용법: tsx src/jobs/cli.ts <${Object.keys(JOBS).join("|")}>`);
  process.exit(1);
}
runJob(name)
  .then((r) => {
    console.log(r.ok ? "OK" : "FAIL", r.message);
    process.exitCode = r.ok ? 0 : 1;
  })
  .finally(() => prisma.$disconnect());
