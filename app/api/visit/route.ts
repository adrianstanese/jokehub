import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/visit — get visit stats
export async function GET() {
  const [total, byCountry] = await Promise.all([
    prisma.visit.count(),
    prisma.visit.groupBy({
      by: ["country", "flag"],
      _count: true,
      orderBy: { _count: { country: "desc" } },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    total,
    countries: byCountry.map((c) => ({
      country: c.country,
      flag: c.flag,
      count: c._count,
    })),
  });
}

// POST /api/visit — log a visit
export async function POST(req: NextRequest) {
  try {
    const { visitorId, country, flag } = await req.json();

    // Only log once per visitor per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (visitorId) {
      const alreadyToday = await prisma.visit.findFirst({
        where: { visitorId, createdAt: { gte: todayStart } },
      });
      if (alreadyToday) {
        return NextResponse.json({ logged: false });
      }
    }

    await prisma.visit.create({
      data: {
        visitorId: visitorId || null,
        country: country || "XX",
        flag: flag || "🏳️",
      },
    });

    return NextResponse.json({ logged: true });
  } catch (e) {
    console.error("POST /api/visit error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
