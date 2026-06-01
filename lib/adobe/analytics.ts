/**
 * Adobe Web SDK (Alloy) analytics module.
 *
 * Reads configuration from:
 *   NEXT_PUBLIC_ADOBE_DATASTREAM_ID  – Edge Network datastream ID
 *   NEXT_PUBLIC_ADOBE_ORG_ID         – Adobe IMS Org ID (format: XXXX@AdobeOrg)
 *
 * When either variable is missing the module is a no-op so local dev never
 * throws. Set both in .env.local (never commit real values).
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alloy?: (...args: any[]) => Promise<any>;
  }
}

let initialized = false;

const DATASTREAM_ID = process.env.NEXT_PUBLIC_ADOBE_DATASTREAM_ID;
const ORG_ID = process.env.NEXT_PUBLIC_ADOBE_ORG_ID;

const isConfigured = Boolean(DATASTREAM_ID && ORG_ID);

/** Map a pathname to a human-readable site section. */
function deriveSection(pathname: string): string {
  if (pathname === "/" || pathname === "") return "home";
  const segment = pathname.split("/").filter(Boolean)[0];
  switch (segment) {
    case "about":
      return "about";
    case "blog":
      return "blog";
    case "projects":
      return "projects";
    case "work":
      return "work";
    default:
      return segment ?? "home";
  }
}

/** Lazily import and configure Alloy (runs once). */
async function ensureInitialized(): Promise<boolean> {
  if (!isConfigured) {
    console.warn(
      "[Adobe Analytics] NEXT_PUBLIC_ADOBE_DATASTREAM_ID or NEXT_PUBLIC_ADOBE_ORG_ID is not set. " +
        "Analytics events will be suppressed. Add both vars to .env.local to enable tracking."
    );
    return false;
  }

  if (initialized) return true;

  // Dynamically import so Alloy is never bundled into the server build.
  await import("@adobe/alloy");

  if (typeof window.alloy !== "function") {
    console.warn("[Adobe Analytics] Alloy did not attach to window. Events suppressed.");
    return false;
  }

  await window.alloy("configure", {
    datastreamId: DATASTREAM_ID,
    orgId: ORG_ID,
    // Disable automatic page-view collection — we fire it manually so we can
    // capture client-side route changes in the SPA.
    clickCollectionEnabled: false,
    onBeforeEventSend: () => {}, // required no-op for typed config
  });

  initialized = true;
  return true;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Fire a page-view ExperienceEvent.
 * Call this on initial load AND on every client-side route change.
 */
export async function trackPageView(pathname: string): Promise<void> {
  const ready = await ensureInitialized();
  if (!ready || typeof window.alloy !== "function") return;

  const section = deriveSection(pathname);
  const pageUrl = window.location.href;
  const referrer = document.referrer;

  await window.alloy("sendEvent", {
    xdm: {
      eventType: "web.webpagedetails.pageViews",
      web: {
        webPageDetails: {
          name: pathname,
          URL: pageUrl,
          // Custom dimension: site section (maps to an eVar / XDM field in AEP)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _justinmillheim: { siteSection: section } as any,
        },
        webReferrer: {
          URL: referrer,
        },
      },
    },
  });
}

/**
 * Fire a custom interaction ExperienceEvent.
 *
 * @param name    Short event name, e.g. "contact_modal_open"
 * @param payload Additional XDM fields merged into the event body
 */
export async function trackEvent(
  name: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const ready = await ensureInitialized();
  if (!ready || typeof window.alloy !== "function") return;

  await window.alloy("sendEvent", {
    xdm: {
      eventType: name,
      web: {
        webPageDetails: {
          URL: window.location.href,
        },
        webReferrer: {
          URL: document.referrer,
        },
      },
      ...payload,
    },
  });
}
