import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function PUT(request: Request) {
  const denied = checkAdminAuth(request);
  if (denied) return denied;
  const body = await request.json();
  const { questionIds } = body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: "questionIds must be a non-empty array" }, { status: 400 });
  }

  await prisma.$transaction(
    questionIds.map((id: string, index: number) =>
      prisma.question.update({
        where: { id },
        data: { order: index + 1 },
      })
    )
  );

  return NextResponse.json({ success: true });
}
