import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: { votes: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const results = aggregateResults(question.type, question.votes.map((v: { value: string }) => v.value));

  return NextResponse.json(results);
}

function aggregateResults(
  type: string,
  values: string[]
): Record<string, unknown> {
  if (type === "multiple_choice") {
    const counts: Record<string, number> = {};
    for (const v of values) {
      counts[v] = (counts[v] ?? 0) + 1;
    }
    return { counts };
  }

  if (type === "word_cloud") {
    const frequency: Record<string, number> = {};
    for (const v of values) {
      const word = v.trim().toLowerCase();
      if (word) frequency[word] = (frequency[word] ?? 0) + 1;
    }
    return { frequency };
  }

  if (type === "rating_scale") {
    const counts: Record<string, number> = {};
    let sum = 0;
    for (const v of values) {
      counts[v] = (counts[v] ?? 0) + 1;
      sum += Number(v);
    }
    const average = values.length > 0 ? sum / values.length : null;
    return { counts, average };
  }

  return {};
}

export { aggregateResults };
