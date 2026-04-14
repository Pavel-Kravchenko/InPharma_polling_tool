import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await prisma.vote.deleteMany({ where: { questionId: id } });
  return NextResponse.json({ success: true });
}
