import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const presentations = await prisma.presentation.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(presentations);
}

async function generateRoomCode(): Promise<string> {
  while (true) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const existing = await prisma.presentation.findUnique({
      where: { roomCode: code },
    });
    if (!existing) return code;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const roomCode = await generateRoomCode();
  const presentation = await prisma.presentation.create({
    data: { title, roomCode },
  });

  return NextResponse.json(presentation, { status: 201 });
}
