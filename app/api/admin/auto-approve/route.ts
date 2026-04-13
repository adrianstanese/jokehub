import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/auto-approve — auto-approves pending jokes older than 8h
// Can be called by Vercel Cron or manually
export async function GET() {
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

  const result = await prisma.joke.updateMany({
    where: {
      status: "pending",
      createdAt: { lte: eightHoursAgo },
      thumbsDown: { lt: 5 }, // Don't auto-approve heavily downvoted pending jokes
    },
    data: {
      status: "approved",
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ autoApproved: result.count });
}
