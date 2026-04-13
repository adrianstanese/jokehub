import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  return {
    title: `#${decoded} Jokes — Jokes Jar`,
    description: `The funniest #${decoded} jokes voted by the community. Browse, laugh, vote!`,
    openGraph: { title: `#${decoded} Jokes — Jokes Jar`, description: `Community-voted #${decoded} jokes` },
  };
}

export default async function TagPage({ params }: Props) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  const tag = await prisma.tag.findUnique({ where: { name: decoded } });
  if (!tag) notFound();

  const jokes = await prisma.joke.findMany({
    where: { status: "approved", tags: { some: { tagId: tag.id } } },
    orderBy: { thumbsUp: "desc" },
    take: 50,
    include: { tags: { include: { tag: true } } },
  });

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px", fontFamily: "'DM Sans', sans-serif" }}>
      <a href="/" style={{ fontSize: 13, color: "var(--purple)", textDecoration: "none", fontWeight: 650, marginBottom: 20, display: "inline-block" }}>
        ← Back to Jokes Jar
      </a>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>#{decoded}</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>{jokes.length} joke{jokes.length !== 1 ? "s" : ""}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {jokes.map(j => (
          <a key={j.id} href={`/joke/${j.id}`} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--glass)", backdropFilter: "blur(20px) saturate(1.8)",
              borderRadius: 16, border: "1px solid var(--glass-border)",
              boxShadow: "var(--card-shadow)", padding: "20px 24px",
              transition: "transform .2s",
            }}>
              <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--text)", margin: "0 0 10px" }}>
                {j.text.length > 200 ? j.text.slice(0, 200) + "…" : j.text}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>@{j.author} · 👍 {j.thumbsUp}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {j.tags.map(t => (
                    <span key={t.tag.name} style={{ fontSize: 11, color: "var(--purple)", background: "var(--purple-faint)", borderRadius: 6, padding: "3px 8px", fontWeight: 600 }}>
                      #{t.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
