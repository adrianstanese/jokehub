import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const trending = sp.get("trending") === "true";

  if (trending) {
    // Trending = tags with most votes in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tags = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT t.name, COUNT(jt."jokeId") as count
      FROM "Tag" t
      JOIN "JokeTag" jt ON jt."tagId" = t.id
      JOIN "Joke" j ON j.id = jt."jokeId"
      WHERE j.status = 'approved' AND j."approvedAt" >= ${oneDayAgo}
      GROUP BY t.name
      ORDER BY count DESC
      LIMIT 10
    `;
    return NextResponse.json(tags.map((t) => ({ name: t.name, count: Number(t.count) })));
  }

  // All tags with counts
  const tags = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
    SELECT t.name, COUNT(jt."jokeId") as count
    FROM "Tag" t
    JOIN "JokeTag" jt ON jt."tagId" = t.id
    JOIN "Joke" j ON j.id = jt."jokeId"
    WHERE j.status = 'approved'
    GROUP BY t.name
    ORDER BY count DESC
  `;

  return NextResponse.json(tags.map((t) => ({ name: t.name, count: Number(t.count) })));
}
