import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@/server/auth";

export async function POST(req: NextRequest) {
  await logout();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
