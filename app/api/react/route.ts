import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { jokeId, emoji, visitorId } = await req.json();
    if (!jokeId || !emoji || !visitorId) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    const existing = await prisma.reaction.findUnique({
      where: { jokeId_visitorId: { jokeId, visitorId } },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        // Toggle off
        await prisma.reaction.delete({ where: { id: existing.id } });
        return NextResponse.json({ action: "removed" });
      } else {
        // Change emoji
        await prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
        return NextResponse.json({ action: "changed" });
      }
    }

    await prisma.reaction.create({ data: { jokeId, emoji, visitorId } });
    return NextResponse.json({ action: "added" });
  } catch (e: any) {
    console.error("POST /api/react error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
