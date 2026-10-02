import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { sendMail } from "./mail";

const COOKIE = "wr_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;

const secret = () => process.env.SESSION_SECRET ?? "dev-secret";
const hash = (v: string) => createHash("sha256").update(`${secret()}:${v}`).digest("hex");

export const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

export async function requestLoginCode(rawEmail: string) {
  const email = normEmail(rawEmail);
  if (!validEmail(email)) return { ok: false as const, error: "이메일 주소 형식을 확인해 주세요." };
  const recent = await prisma.loginCode.count({ where: { email, createdAt: { gt: new Date(Date.now() - 15 * 60e3) } } });
  if (recent >= 5) return { ok: false as const, error: "요청이 너무 많습니다. 15분 뒤 다시 시도해 주세요." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.loginCode.create({ data: { email, codeHash: hash(`${email}:${code}`), expiresAt: new Date(Date.now() + CODE_MINUTES * 60e3) } });
  await sendMail(email, `[와인루트] 로그인 코드 ${code}`, `로그인 코드: ${code}\n${CODE_MINUTES}분 안에 입력해 주세요. 요청하지 않았다면 이 메일을 무시하세요.`);
  return { ok: true as const, email };
}

export async function verifyLoginCode(rawEmail: string, code: string) {
  const email = normEmail(rawEmail);
  const row = await prisma.loginCode.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= 5) return { ok: false as const, error: "코드가 만료됐습니다. 새 코드를 받아 주세요." };
  const a = Buffer.from(row.codeHash);
  const b = Buffer.from(hash(`${email}:${code.trim()}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await prisma.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false as const, error: "코드가 맞지 않습니다." };
  }
  await prisma.loginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { id: hash(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400e3) } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true as const, user };
}

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { id: hash(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return s.user;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hash(token) } });
  jar.delete(COOKIE);
}

export function isAdminEmail(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => normEmail(e))
    .filter(Boolean)
    .includes(normEmail(email));
}

export async function requireUser(next = "/me") {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin() {
  const u = await requireUser("/admin");
  if (!isAdminEmail(u.email)) redirect("/");
  return u;
}
