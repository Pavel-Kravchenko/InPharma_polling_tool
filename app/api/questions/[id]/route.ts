import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json(question);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, options, scaleMin, scaleMax, scaleMinLabel, scaleMaxLabel } = body;

  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(options !== undefined && { options: JSON.stringify(options) }),
      ...(scaleMin !== undefined && { scaleMin }),
      ...(scaleMax !== undefined && { scaleMax }),
      ...(scaleMinLabel !== undefined && { scaleMinLabel }),
      ...(scaleMaxLabel !== undefined && { scaleMaxLabel }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await prisma.question.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
