import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JokeHub — The World's Funniest Corner of the Internet",
  description: "Browse, vote, and share jokes in 70+ languages. Community-curated humor with daily highlights, trending topics, and zero sign-up required.",
  keywords: ["jokes", "humor", "funny", "multilingual jokes", "joke of the day", "comedy"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://jokehub.vercel.app"),
  openGraph: {
    title: "JokeHub — Laugh. Vote. Repeat.",
    description: "The world's funniest corner of the internet. Jokes in 70+ languages.",
    type: "website",
    siteName: "JokeHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "JokeHub — Laugh. Vote. Repeat.",
    description: "The world's funniest corner of the internet.",
  },
  manifest: "/manifest.json",
  themeColor: "#7C3AED",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('jokehub-theme');
                if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
