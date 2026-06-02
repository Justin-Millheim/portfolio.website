// Single source of truth for custom analytics events.
//
// Today this forwards events to Vercel Web Analytics. When GA4 is added later,
// teach ONLY this function to also call `window.gtag("event", name, props)` —
// every call site below stays untouched. That's the whole point of the seam.
//
// Keep event names snake_case and stable; renaming them resets their history.

import { track as vercelTrack } from "@vercel/analytics";

export type EventName =
  | "contact_open" // contact modal opened (top of the outreach funnel)
  | "contact_start" // first field focused — reader began filling the form
  | "contact_submit" // contact form successfully sent (the conversion)
  | "contact_error" // contact form failed to send
  | "outbound_click" // click on an external link (LinkedIn, GitHub, etc.)
  | "blog_view" // a blog post page was opened (with slug + title)
  | "blog_progress" // reader passed a scroll-depth milestone (25/50/75/100%)
  | "page_engagement" // on leave: active seconds + max scroll depth for any page
  | "content_click" // clicked an internal content link (mode card, tile, etc.)
  | "carousel_nav" // advanced a carousel (testimonials / blog gallery)
  | "image_expand" // opened an image in the lightbox
  | "work_expand" // expanded a role on the Work page
  | "filter_apply" // applied a filter chip (Work / Projects)
  | "view_toggle"; // switched a view toggle (Projects: Shipped / Blog)

type Props = Record<string, string | number | boolean | null>;

export function track(name: EventName, props?: Props) {
  // Vercel Web Analytics — no-op in dev / when the script isn't loaded.
  vercelTrack(name, props);

  // --- GA4 goes here later (one place) ---
  // if (typeof window !== "undefined" && typeof window.gtag === "function") {
  //   window.gtag("event", name, props ?? {});
  // }
}
