import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { isRedirectError, summarizeForm } from "@/lib/audit";

/**
 * 관리자 작업을 실행하고 결과(성공·실패)를 기록합니다. 기록이 실패해도 작업 결과는 그대로 돌려줍니다.
 */
export async function audited<T>(adminEmail: string, action: string, fd: FormData | null, fn: () => Promise<T>): Promise<T> {
  const detail = summarizeForm(fd) as Prisma.InputJsonObject;
  // 기록 실패(동기·비동기 모두)는 작업 결과에 영향을 주지 않습니다.
  const log = async (ok: boolean, error?: string) => {
    try {
      await prisma.adminLog.create({ data: { adminEmail, action, ok, detail, error: error?.slice(0, 500) ?? null } });
    } catch (e) {
      console.error("audit", e);
    }
  };
  try {
    const r = await fn();
    await log(true);
    return r;
  } catch (e) {
    await log(isRedirectError(e), isRedirectError(e) ? undefined : (e as Error).message);
    throw e;
  }
}
