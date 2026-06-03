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

        {/* Adobe Experience Platform Launch */}
        <Script
          id="adobe-launch"
          src="https://assets.adobedtm.com/22bf1a13013f/fa2492cb0f8b/launch-98e2ae7d72ea-development.min.js"
          strategy="afterInteractive"
        />
        {/* End Adobe Experience Platform Launch */}

        {/* Adobe Analytics — Experience Cloud ID service + AppMeasurement.
            beforeInteractive guarantees VisitorAPI loads before AppMeasurement. */}
        <Script src="/js/VisitorAPI.js" strategy="beforeInteractive" />
        <Script src="/js/AppMeasurement.js" strategy="beforeInteractive" />
        <Script id="adobe-analytics-init" strategy="afterInteractive">
          {`(function () {
  // TODO: replace these with the values from your Adobe Analytics admin.
  var REPORT_SUITE_ID = "REPLACE_WITH_REPORT_SUITE_ID";
  var ORG_ID = "REPLACE_WITH_ORG_ID@AdobeOrg";
  var TRACKING_SERVER = "REPLACE_WITH_TRACKING_SERVER";

  // Don't run until configured (keeps the live site error-free).
  if (REPORT_SUITE_ID.indexOf("REPLACE_WITH_") === 0 || typeof s_gi !== "function") return;

  try {
    if (typeof Visitor !== "undefined" && ORG_ID.indexOf("REPLACE_WITH_") !== 0) {
      window.visitor = Visitor.getInstance(ORG_ID, {
        trackingServer: TRACKING_SERVER,
        trackingServerSecure: TRACKING_SERVER
      });
    }
    var s = s_gi(REPORT_SUITE_ID);
    s.trackingServer = TRACKING_SERVER;
    s.trackingServerSecure = TRACKING_SERVER;
    if (window.visitor) s.visitor = window.visitor;
    s.pageName = document.title;
    s.t(); // send the page view
    window.s = s;
  } catch (e) {
    /* no-op: never let analytics break the page */
  }
})();`}
        </Script>
        {/* End Adobe Analytics */}
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
