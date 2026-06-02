import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MSFLT8BM');`}
        </Script>
        {/* End Google Tag Manager */}
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MSFLT8BM"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
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
