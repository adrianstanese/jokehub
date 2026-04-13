import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await prisma.joke.count({ where: { status: "approved" } });
  if (count === 0) return NextResponse.json({ error: "No jokes yet" }, { status: 404 });

  const skip = Math.floor(Math.random() * count);
  const joke = await prisma.joke.findFirst({
    where: { status: "approved" },
    skip,
    include: {
      tags: { include: { tag: true } },
      reactions: { select: { emoji: true } },
    },
  });

  if (!joke) return NextResponse.json({ error: "No jokes yet" }, { status: 404 });

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
  });
}
