import Image from "next/image";

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
  return (
    <figure className="blog-fig">
      <Image
        src={src}
        alt={alt}
        width={w}
        height={h}
        sizes="(max-width: 760px) 92vw, 720px"
        style={{ width: "100%", height: "auto" }}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
