"use client";

import Image from "next/image";
import { useLightbox } from "./Lightbox";

export default function Fig({
  src,
  alt = "",
  caption,
  w,
  h,
}: {
  src: string;
  alt?: string;
  caption?: string;
  w: number;
  h: number;
}) {
  const { open } = useLightbox();
  return (
    <figure className="blog-fig">
      <button type="button" className="zoomable" onClick={() => open({ src, alt })} aria-label="Expand image">
        <Image
          src={src}
          alt={alt}
          width={w}
          height={h}
          sizes="(max-width: 760px) 92vw, 720px"
          style={{ width: "100%", height: "auto" }}
        />
      </button>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
