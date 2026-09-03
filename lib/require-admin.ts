import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySession } from "./admin-auth.ts";
import { adminEnv } from "./env.ts";

export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  return verifySession(token, adminEnv().ADMIN_SESSION_SECRET);
}

/** Returns a 401 response to short-circuit with, or null if the caller is an authenticated admin. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const ok = await isAdminRequest();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
