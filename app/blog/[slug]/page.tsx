import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLogPost, getAllSlugs, formatDate } from "@/lib/log";
import LightboxProvider from "@/components/blog/Lightbox";
import Fig from "@/components/blog/Fig";
import Gallery from "@/components/blog/Gallery";
import Carousel from "@/components/blog/Carousel";
import Suno from "@/components/blog/Suno";

const mdxComponents = { Fig, Gallery, Carousel, Suno };

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  if (!getAllSlugs().includes(params.slug)) return { title: "Blog — Justin Millheim" };
  const { meta } = getLogPost(params.slug);
  return { title: `${meta.title} — Justin Millheim`, description: meta.excerpt };
}

export default function LogPost({ params }: { params: { slug: string } }) {
  if (!getAllSlugs().includes(params.slug)) notFound();

  const { meta, content } = getLogPost(params.slug);

  return (
    <LightboxProvider>
      <article className="wrap section post">
        <Link className="back" href="/blog">
          ← back to blog
        </Link>
        <div className="eyebrow" style={{ marginTop: 18 }}>
          {formatDate(meta.date)}
        </div>
        <h1 className="post-title">{meta.title}</h1>
        <div className="post-body">
          <MDXRemote source={content} components={mdxComponents} />
        </div>
      </article>
    </LightboxProvider>
  );
}
