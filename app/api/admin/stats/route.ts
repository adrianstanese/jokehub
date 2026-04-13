import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const [total, pending, approved, removed, flagged, votesToday, submissionsWeek, topLangs, visits] = await Promise.all([
    prisma.joke.count(),
    prisma.joke.count({ where: { status: "pending" } }),
    prisma.joke.count({ where: { status: "approved" } }),
    prisma.joke.count({ where: { status: "removed" } }),
    prisma.joke.count({ where: { flagCount: { gt: 0 } } }),
    prisma.vote.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.joke.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.joke.groupBy({ by: ["lang"], where: { status: "approved" }, _count: true, orderBy: { _count: { lang: "desc" } }, take: 10 }),
    prisma.visit.count(),
  ]);

  return NextResponse.json({
    total, pending, approved, removed, flagged, votesToday, submissionsWeek, visits,
    topLangs: topLangs.map(l => ({ lang: l.lang, count: l._count })),
  });
}
