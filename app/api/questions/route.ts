import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { presentationId, type, title, options, scaleMin, scaleMax, scaleMinLabel, scaleMaxLabel } =
    body;

  if (!presentationId || !type || !title) {
    return NextResponse.json(
      { error: "presentationId, type, and title are required" },
      { status: 400 }
    );
  }

  const presentation = await prisma.presentation.findUnique({
    where: { id: presentationId },
    include: { questions: { orderBy: { order: "desc" }, take: 1 } },
  });

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
  }

  const nextOrder = (presentation.questions[0]?.order ?? 0) + 1;

  const question = await prisma.question.create({
    data: {
      presentationId,
      type,
      title,
      options: options ? JSON.stringify(options) : null,
      scaleMin: scaleMin ?? null,
      scaleMax: scaleMax ?? null,
      scaleMinLabel: scaleMinLabel ?? null,
      scaleMaxLabel: scaleMaxLabel ?? null,
      order: nextOrder,
    },
  });

  return NextResponse.json(question, { status: 201 });
}
