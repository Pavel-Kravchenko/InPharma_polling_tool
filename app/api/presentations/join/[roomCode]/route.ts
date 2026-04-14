import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  const presentation = await prisma.presentation.findUnique({
    where: { roomCode },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
  }

  const activeQuestion = presentation.questions.find((q) => q.isActive) ?? null;

  return NextResponse.json({ ...presentation, activeQuestion });
}
