import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { jokeId, reason, visitorId } = await req.json();
    if (!jokeId || !visitorId) {
      return NextResponse.json({ error: "Invalid flag" }, { status: 400 });
    }

    await prisma.flag.create({
      data: { jokeId, visitorId, reason: reason || "inappropriate" },
    });

    await prisma.joke.update({
      where: { id: jokeId },
      data: { flagCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Already flagged" }, { status: 409 });
    }
    console.error("POST /api/flag error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
