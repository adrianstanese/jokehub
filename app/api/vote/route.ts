import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { jokeId, value, visitorId } = await req.json();

    if (!jokeId || !visitorId || (value !== 1 && value !== -1)) {
      return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
    }

    // Check if already voted
    const existing = await prisma.vote.findUnique({
      where: { jokeId_visitorId: { jokeId, visitorId } },
    });

    if (existing) {
      if (existing.value === value) {
        // Remove vote (toggle off)
        await prisma.vote.delete({ where: { id: existing.id } });
        await prisma.joke.update({
          where: { id: jokeId },
          data: value === 1 ? { thumbsUp: { decrement: 1 } } : { thumbsDown: { decrement: 1 } },
        });
        const updated = await prisma.joke.findUnique({ where: { id: jokeId }, select: { thumbsUp: true, thumbsDown: true } });
        return NextResponse.json({ action: "removed", ...updated });
      } else {
        // Change vote direction
        await prisma.vote.update({ where: { id: existing.id }, data: { value } });
        await prisma.joke.update({
          where: { id: jokeId },
          data: value === 1
            ? { thumbsUp: { increment: 1 }, thumbsDown: { decrement: 1 } }
            : { thumbsUp: { decrement: 1 }, thumbsDown: { increment: 1 } },
        });
      }
    } else {
      // New vote
      await prisma.vote.create({ data: { jokeId, visitorId, value } });
      await prisma.joke.update({
        where: { id: jokeId },
        data: value === 1 ? { thumbsUp: { increment: 1 } } : { thumbsDown: { increment: 1 } },
      });
    }

    // Check auto-removal: if thumbsDown >= 20, mark as removed
    const joke = await prisma.joke.findUnique({ where: { id: jokeId }, select: { thumbsUp: true, thumbsDown: true, status: true } });
    if (joke && joke.status === "approved" && joke.thumbsDown >= joke.thumbsUp + 10) {
      await prisma.joke.update({ where: { id: jokeId }, data: { status: "removed" } });
      return NextResponse.json({ action: "auto_removed", ...joke });
    }

