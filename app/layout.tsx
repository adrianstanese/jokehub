import type { Metadata } from "next";
import "./globals.css";

const SITE_NAME = "Jokes Jar";
const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://jokehub.vercel.app";
const DESCRIPTION = "Jokes Jar — the funniest corner of the internet. Browse, vote, and share the best jokes. Community-curated humor with daily highlights, trending topics, and zero sign-up required.";

export const metadata: Metadata = {
  title: {
    default: "Jokes Jar — The Funniest Corner of the Internet",
    template: "%s | Jokes Jar",
  },
  description: DESCRIPTION,
  keywords: ["jokes", "funny jokes", "best jokes", "joke of the day", "humor", "comedy", "jokes online", "daily jokes", "top jokes", "clean jokes", "short jokes", "jokes to tell", "laugh"],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Jokes Jar — Laugh. Vote. Repeat.",
    description: DESCRIPTION,
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jokes Jar — Laugh. Vote. Repeat.",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  themeColor: "#7C3AED",
  icons: { icon: "/favicon.svg" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('jokesjar-theme');
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
