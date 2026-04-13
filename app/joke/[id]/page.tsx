import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const joke = await prisma.joke.findFirst({ where: { id, status: "approved" }, select: { text: true, author: true } });
  if (!joke) return { title: "Joke not found — Jokes Jar" };
  const preview = joke.text.length > 120 ? joke.text.slice(0, 120) + "…" : joke.text;
  return {
    title: `${preview} — Jokes Jar`,
    description: `A joke by @${joke.author} on Jokes Jar`,
    openGraph: { title: preview, description: `By @${joke.author} on Jokes Jar — Laugh. Vote. Repeat.`, type: "article" },
    twitter: { card: "summary", title: preview, description: `By @${joke.author} on Jokes Jar` },
  };
}

export default async function JokePage({ params }: Props) {
  const { id } = await params;
  const joke = await prisma.joke.findFirst({
    where: { id, status: "approved" },
    include: { tags: { include: { tag: true } } },
  });
  if (!joke) notFound();

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px", fontFamily: "'DM Sans', sans-serif" }}>
      <a href="/" style={{ fontSize: 13, color: "var(--purple)", textDecoration: "none", fontWeight: 650, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        ← Back to Jokes Jar
      </a>
      <div style={{
        background: "var(--glass)", backdropFilter: "blur(20px) saturate(1.8)",
        borderRadius: 20, border: "1px solid var(--glass-border)",
        boxShadow: "var(--card-shadow)", padding: "32px 30px",
      }}>
        <p style={{ fontSize: 20, lineHeight: 1.6, color: "var(--text)", margin: "0 0 20px" }}>{joke.text}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            @{joke.author} · 👍 {joke.thumbsUp} · 👎 {joke.thumbsDown}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {joke.tags.map(t => (
              <a key={t.tag.name} href={`/tag/${t.tag.name}`}
                style={{ fontSize: 12, color: "var(--purple)", background: "var(--purple-faint)", borderRadius: 8, padding: "4px 10px", fontWeight: 600, textDecoration: "none" }}>
                #{t.tag.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
