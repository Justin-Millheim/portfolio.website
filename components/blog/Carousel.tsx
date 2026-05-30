"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { galleries } from "@/content/galleries";
import { useLightbox } from "./Lightbox";

export default function Carousel({ slug }: { slug: string }) {
  const { open } = useLightbox();
  const items = galleries[slug] || [];
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const step = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const amount = first ? first.clientWidth + 14 : el.clientWidth * 0.8;
    const maxLeft = el.scrollWidth - el.clientWidth;
    // wrap around at the ends
    if (dir > 0 && el.scrollLeft >= maxLeft - 8) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (dir < 0 && el.scrollLeft <= 8) {
      el.scrollTo({ left: maxLeft, behavior: "smooth" });
    } else {
      el.scrollBy({ left: amount * dir, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (items.length <= 1) return;
    const id = setInterval(() => {
      if (!pausedRef.current) step(1);
    }, 4500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div
      className="blog-carousel"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
    >
      <button className="carousel-arrow left" aria-label="Previous images" onClick={() => step(-1)}>
        <ChevronLeft size={20} />
      </button>
      <div className="carousel-track" ref={trackRef}>
        {items.map((it, i) => (
          <button type="button" key={i} className="carousel-item" onClick={() => open(it)} aria-label="Expand image">
            <Image src={it.src} alt={it.alt || ""} fill sizes="(max-width: 760px) 70vw, 340px" style={{ objectFit: "cover" }} />
          </button>
        ))}
      </div>
      <button className="carousel-arrow right" aria-label="Next images" onClick={() => step(1)}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
