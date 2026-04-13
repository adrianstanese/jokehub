import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const joke = await prisma.joke.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      reactions: { select: { emoji: true } },
    },
  });

  if (!joke || joke.status !== "approved") {
    return NextResponse.json({ error: "Joke not found" }, { status: 404 });
  }

  const reactionCounts: Record<string, number> = {};
  joke.reactions.forEach((r) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  return NextResponse.json({
    id: joke.id,
    text: joke.text,
    author: joke.author,
    lang: joke.lang,
    thumbsUp: joke.thumbsUp,
    thumbsDown: joke.thumbsDown,
    tags: joke.tags.map((t) => t.tag.name),
    reactions: reactionCounts,
    createdAt: joke.createdAt.toISOString(),
    approvedAt: joke.approvedAt?.toISOString() || null,
  });
}
