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
    countries: byCountry
      .filter((c) => c.country !== "XX")
      .map((c) => ({
        country: c.country,
        flag: c.flag,
        count: c._count,
      })),
  });
}

// POST /api/visit — log every visit, detect country from Vercel headers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Vercel provides free geo headers on every request
    const countryHeader = req.headers.get("x-vercel-ip-country") || "";
    const cc = body.country || countryHeader || "XX";

    // Convert country code to flag emoji
    const codeToFlag = (code: string) => {
      if (!code || code.length !== 2 || code === "XX") return "🏳️";
      return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    };

    const flag = body.flag || codeToFlag(cc);

    await prisma.visit.create({
      data: {
        country: cc,
        flag: flag,
      },
    });

    return NextResponse.json({ logged: true });
  } catch (e) {
    console.error("POST /api/visit error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
