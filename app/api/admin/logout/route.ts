import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

// A plain <form method="post"> submits this directly (no JS), so it redirects
// rather than returning JSON — see the logout button in the admin layout.
export async function POST(req: Request) {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
