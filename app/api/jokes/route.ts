import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/jokes — list jokes with filters
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang") || "ALL";
  const tag = sp.get("tag") || "";
  const sort = sp.get("sort") || "popular";
  const period = sp.get("period") || "all";
  const page = parseInt(sp.get("page") || "1");
  const limit = Math.min(parseInt(sp.get("limit") || "20"), 50);
  const status = sp.get("status") || "approved";

  const where: any = { status };

  if (lang !== "ALL") where.lang = lang;
  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  // Time period filter
  const now = new Date();
  if (period === "today") {
    where.approvedAt = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  } else if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    where.approvedAt = { gte: d };
  } else if (period === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    where.approvedAt = { gte: d };
  } else if (period === "year") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    where.approvedAt = { gte: d };
  }

  let orderBy: any = {};
  if (sort === "popular") orderBy = { thumbsUp: "desc" };
  else if (sort === "newest") orderBy = { approvedAt: "desc" };
  else if (sort === "oldest") orderBy = { approvedAt: "asc" };

  const [jokes, total] = await Promise.all([
    prisma.joke.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tags: { include: { tag: true } },
        reactions: {
          select: { emoji: true },
        },
      },
    }),
    prisma.joke.count({ where }),
  ]);

  // Aggregate reactions per joke
  const result = jokes.map((j) => {
    const reactionCounts: Record<string, number> = {};
    j.reactions.forEach((r) => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });
    return {
      id: j.id,
      text: j.text,
      author: j.author,
      lang: j.lang,
      thumbsUp: j.thumbsUp,
      thumbsDown: j.thumbsDown,
      tags: j.tags.map((t) => t.tag.name),
      reactions: reactionCounts,
      createdAt: j.createdAt.toISOString(),
      approvedAt: j.approvedAt?.toISOString() || null,
    };
  });

  return NextResponse.json({ jokes: result, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/jokes — submit a new joke
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, author, lang, tags } = body;

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "Joke must be at least 10 characters" }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ error: "Joke must be under 500 characters" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

    // Rate limit: max 5 jokes per hour per IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.joke.count({
      where: { ip, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= 5) {
      return NextResponse.json({ error: "Rate limit: max 5 jokes per hour. Try again later." }, { status: 429 });
    }

    // Duplicate detection: simple text similarity check
    const normalizedText = text.trim().toLowerCase().replace(/[^a-z0-9\s\u00C0-\u024F\u0400-\u04FF]/g, "");

    // Check last 100 jokes for duplicates
    const recentJokes = await prisma.joke.findMany({
      where: { status: { in: ["pending", "approved"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { text: true },
    });

    for (const rj of recentJokes) {
      const rjNorm = rj.text.trim().toLowerCase().replace(/[^a-z0-9\s\u00C0-\u024F\u0400-\u04FF]/g, "");
      if (rjNorm === normalizedText) {
        return NextResponse.json({ error: "This joke already exists!" }, { status: 409 });
      }
      // Simple similarity: if >80% of words match
      const words1 = new Set(normalizedText.split(/\s+/));
      const words2 = new Set(rjNorm.split(/\s+/));
      const intersection = [...words1].filter((w) => words2.has(w));
      const similarity = intersection.length / Math.max(words1.size, words2.size);
      if (similarity > 0.8 && words1.size > 3) {
        return NextResponse.json({ error: "A very similar joke already exists!" }, { status: 409 });
      }
    }

    // Create joke with tags
    const tagNames: string[] = (tags || []).slice(0, 5).map((t: string) => {
      let clean = t.trim().toLowerCase();
      if (clean.startsWith("#")) clean = clean.slice(1);
      return clean;
    }).filter((t: string) => t.length > 0);

    // Upsert tags
    const tagRecords = await Promise.all(
      tagNames.map((name) =>
        prisma.tag.upsert({ where: { name }, create: { name }, update: {} })
      )
    );

    const joke = await prisma.joke.create({
      data: {
        text: text.trim(),
        author: author?.trim() || "Anonymous",
        lang: lang || "EN",
        ip,
        status: "pending",
        tags: {
          create: tagRecords.map((t) => ({ tagId: t.id })),
        },
      },
    });

    return NextResponse.json({ id: joke.id, status: "pending" }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/jokes error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
