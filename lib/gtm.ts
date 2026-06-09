/**
 * Google Tag Manager dataLayer utility.
 *
 * Push events from any client component. GTM picks them up and routes them
 * to whatever tags are configured in the GTM workspace (Adobe Analytics,
 * AEP Web SDK, GA4, etc.).
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function push(data: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(data);
}

/**
 * Fire a page-view event. Call on initial load and every client-side route
 * change. GTM's built-in History Change trigger handles most SPAs
 * automatically, but an explicit push gives you reliable control.
 */
export function trackPageView(pathname: string): void {
  push({
    event: "page_view",
    page_path: pathname,
    page_url: typeof window !== "undefined" ? window.location.href : "",
    page_referrer: typeof document !== "undefined" ? document.referrer : "",
  });
}

/**
 * Fire a named interaction event.
 *
 * @param name    Short snake_case event name, e.g. "contact_modal_open"
 * @param payload Additional key/value pairs merged into the dataLayer push
 */
export function trackEvent(
  name: string,
  payload: Record<string, unknown> = {}
): void {
  push({ event: name, ...payload });
}
