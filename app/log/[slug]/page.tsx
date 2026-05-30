import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLogPost, getLogPosts, formatDate } from "@/lib/log";

export function generateStaticParams() {
  return getLogPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getLogPosts().find((p) => p.slug === params.slug);
  if (!post) return { title: "Log — Justin Millheim" };
  return { title: `${post.title} — Justin Millheim`, description: post.excerpt };
}

export default function LogPost({ params }: { params: { slug: string } }) {
  const exists = getLogPosts().some((p) => p.slug === params.slug);
  if (!exists) notFound();

  const { meta, content } = getLogPost(params.slug);

  return (
    <article className="wrap section post">
      <Link className="back" href="/projects">
        ← back to projects
      </Link>
      <div className="eyebrow" style={{ marginTop: 18 }}>
        {formatDate(meta.date)}
      </div>
      <h1 className="post-title">{meta.title}</h1>
      <div className="post-body">
        <MDXRemote source={content} />
      </div>
    </article>
  );
}
