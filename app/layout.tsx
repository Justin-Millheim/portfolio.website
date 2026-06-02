import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactProvider from "@/components/ContactContext";
import PageEngagement from "@/components/PageEngagement";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://justinmillheim.com"),
  title: "Justin Millheim — Builder, Connector, AI Enthusiast",
  description:
    "Builder, connector, and AI enthusiast turning messy problems into systems that make work better. Cleaner systems, closer teams, better work.",
  openGraph: {
    title: "Justin Millheim — Builder, Connector, AI Enthusiast",
    description: "Cleaner systems, closer teams, better work.",
    url: "https://justinmillheim.com",
    siteName: "Justin Millheim",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Justin Millheim — Builder, Connector, AI Enthusiast",
    description: "Cleaner systems, closer teams, better work.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <ContactProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </ContactProvider>
        <PageEngagement />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
