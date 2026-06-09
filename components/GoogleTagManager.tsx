"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { trackPageView } from "@/lib/gtm";

const GTM_ID = "GTM-MSFLT8BM";

/**
 * Injects the GTM <script> snippet and fires a page_view dataLayer event on
 * every client-side route change.
 *
 * Mount once inside the root layout, wrapped in <Suspense> (required by
 * useSearchParams in Next.js App Router).
 */
export default function GoogleTagManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();
    const currentUrl = qs ? `${pathname}?${qs}` : pathname;
    if (currentUrl === prevUrl.current) return;
    prevUrl.current = currentUrl;
    trackPageView(pathname);
  }, [pathname, searchParams]);

  return (
    <>
      {/* GTM loader — runs after hydration, non-blocking */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />
      {/* GTM noscript fallback */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
