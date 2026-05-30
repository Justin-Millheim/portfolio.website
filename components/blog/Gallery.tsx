import Image from "next/image";
import { galleries } from "@/content/galleries";

export default function Gallery({ slug }: { slug: string }) {
  const items = galleries[slug] || [];
  if (items.length === 0) return null;
  return (
    <div className="blog-gallery">
      {items.map((it, i) => (
        <div key={i} className="g-cell">
          <Image
            src={it.src}
            alt={it.alt || ""}
            fill
            sizes="(max-width: 760px) 50vw, 240px"
            style={{ objectFit: "cover" }}
          />
        </div>
      ))}
    </div>
  );
}
