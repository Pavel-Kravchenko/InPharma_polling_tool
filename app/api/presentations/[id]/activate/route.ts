import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { questionId } = body;

  if (!questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  const presentation = await prisma.presentation.findUnique({
    where: { id },
    include: { questions: true },
  });

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
  }

  const targetQuestion = presentation.questions.find((q) => q.id === questionId);
  if (!targetQuestion) {
    return NextResponse.json(
      { error: "Question not found in this presentation" },
      { status: 404 }
    );
  }

  // Deactivate all questions, then activate the target
  await prisma.question.updateMany({
    where: { presentationId: id },
    data: { isActive: false },
  });

  const activeQuestion = await prisma.question.update({
    where: { id: questionId },
    data: { isActive: true },
  });

  eventBus.emit(`presentation:${id}`, {
    type: "question_changed",
    questionId,
    question: activeQuestion,
  });

  return NextResponse.json(activeQuestion);
}
