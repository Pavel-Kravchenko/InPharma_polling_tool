import { NextResponse } from "next/server";

const HEADER_NAME = "x-admin-password";

export function checkAdminAuth(request: Request): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null; // No password set — allow all access

  const provided = request.headers.get(HEADER_NAME);
  if (provided === password) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
