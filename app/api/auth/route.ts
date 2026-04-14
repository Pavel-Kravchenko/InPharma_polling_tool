import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json();
  if (body.password === password) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}
