import { NextResponse } from "next/server";
import { getUser } from "@/server/auth";
import { exportAccount } from "@/server/account";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/me%23account", req.url));
  const data = await exportAccount(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cellardoor-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
