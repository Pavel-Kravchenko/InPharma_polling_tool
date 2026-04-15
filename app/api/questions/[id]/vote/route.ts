import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events";
import { aggregateResults } from "../results/route";
import { containsProfanity } from "@/lib/profanityFilter";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { value, deviceId } = body;

  if (!value || !deviceId) {
    return NextResponse.json({ error: "value and deviceId are required" }, { status: 400 });
  }

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Filter profanity on free-text submissions (word cloud)
  if (question.type === "word_cloud" && containsProfanity(value)) {
    return NextResponse.json({ error: "Please keep responses appropriate." }, { status: 400 });
  }

  const vote = await prisma.vote.create({
    data: { questionId: id, value, deviceId },
  });

  // Emit updated results after vote
  const allVotes = await prisma.vote.findMany({ where: { questionId: id } });
  const results = aggregateResults(question.type, allVotes.map((v: { value: string }) => v.value));
  eventBus.emit(`question:${id}`, { type: "vote_update", results });

  return NextResponse.json(vote, { status: 201 });
}
