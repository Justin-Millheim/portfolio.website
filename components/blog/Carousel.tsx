"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { galleries } from "@/content/galleries";
import { useLightbox } from "./Lightbox";

export default function Carousel({ slug }: { slug: string }) {
  const { open } = useLightbox();
  const items = galleries[slug] || [];
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="blog-carousel">
      <div className="carousel-track" style={{ "--n": items.length } as CSSProperties}>
        {loop.map((it, i) => (
          <button
            type="button"
            key={i}
            className="carousel-item"
            onClick={() => open(it)}
            aria-label="Expand image"
            aria-hidden={i >= items.length}
            tabIndex={i >= items.length ? -1 : 0}
          >
            <Image src={it.src} alt={it.alt || ""} fill sizes="320px" style={{ objectFit: "cover" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
