import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const presentation = await prisma.presentation.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
  }

  return NextResponse.json(presentation);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const presentation = await prisma.presentation.findUnique({ where: { id } });

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
  }

  await prisma.presentation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
