import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("secret");
  return secret === process.env.ADMIN_SECRET;
}

// GET /api/admin/jokes — list all jokes with admin info
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "pending";
  const page = parseInt(sp.get("page") || "1");
  const limit = 30;

  const where: any = {};
  if (status !== "all") where.status = status;

  const [jokes, total] = await Promise.all([
    prisma.joke.findMany({
      where,
      orderBy: status === "pending" ? { createdAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tags: { include: { tag: true } },
      },
    }),
    prisma.joke.count({ where }),
  ]);

  return NextResponse.json({
    jokes: jokes.map((j) => ({
      id: j.id,
      text: j.text,
      author: j.author,
      lang: j.lang,
      status: j.status,
      thumbsUp: j.thumbsUp,
      thumbsDown: j.thumbsDown,
      flagCount: j.flagCount,
      tags: j.tags.map((t) => t.tag.name),
      ip: j.ip,
      createdAt: j.createdAt.toISOString(),
      approvedAt: j.approvedAt?.toISOString() || null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// DELETE /api/admin/jokes — delete jokes
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();
  if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: "Invalid ids" }, { status: 400 });

  await prisma.joke.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ deleted: ids.length });
}

// PATCH /api/admin/jokes — approve/reject jokes
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, action } = await req.json();
  if (!ids || !Array.isArray(ids) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.joke.updateMany({
      where: { id: { in: ids } },
      data: { status: "approved", approvedAt: new Date() },
    });
  } else {
    await prisma.joke.updateMany({
      where: { id: { in: ids } },
      data: { status: "rejected" },
    });
  }

  return NextResponse.json({ updated: ids.length, action });
}
