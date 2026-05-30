"use client";

import Image from "next/image";
import { galleries } from "@/content/galleries";
import { useLightbox } from "./Lightbox";

export default function Gallery({ slug }: { slug: string }) {
  const { open } = useLightbox();
  const items = galleries[slug] || [];
  if (items.length === 0) return null;
  return (
    <div className="blog-gallery">
      {items.map((it, i) => (
        <button
          type="button"
          key={i}
          className="g-cell"
          onClick={() => open(it)}
          aria-label="Expand image"
        >
          <Image src={it.src} alt={it.alt || ""} fill sizes="(max-width: 760px) 50vw, 240px" style={{ objectFit: "cover" }} />
        </button>
      ))}
    </div>
  );
}
