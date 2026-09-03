import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkAdminCredentials, signSession, ADMIN_COOKIE_NAME, SESSION_TTL_MS } from "@/lib/admin-auth";
import { adminEnv } from "@/lib/env";
import { isHttpsRequest } from "@/lib/request";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const e = adminEnv();
  if (!checkAdminCredentials(parsed.data, { email: e.ADMIN_EMAIL, password: e.ADMIN_PASSWORD })) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const token = signSession(e.ADMIN_SESSION_SECRET);
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}
