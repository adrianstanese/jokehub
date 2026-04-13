import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://jokehub.vercel.app";

  const [jokes, tags] = await Promise.all([
    prisma.joke.findMany({
      where: { status: "approved" },
      select: { id: true, approvedAt: true },
      orderBy: { approvedAt: "desc" },
      take: 1000,
    }),
    prisma.tag.findMany({ select: { name: true } }),
  ]);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>
`;

  for (const tag of tags) {
    xml += `  <url><loc>${baseUrl}/tag/${encodeURIComponent(tag.name)}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>\n`;
  }

  for (const joke of jokes) {
    xml += `  <url><loc>${baseUrl}/joke/${joke.id}</loc><lastmod>${joke.approvedAt?.toISOString().split("T")[0] || ""}</lastmod><priority>0.5</priority></url>\n`;
  }

  xml += `</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
