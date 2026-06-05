import Link from "next/link";
import { getLogPosts, formatDate } from "@/lib/log";

export const metadata = {
  title: "Blog — Justin Millheim",
  description: "Essays and build logs — on being a builder, connector, and AI enthusiast, plus the tools and trips behind them.",
};

export default function BlogIndex() {
  const posts = getLogPosts();
  return (
    <section className="section" style={{ paddingTop: "clamp(48px,7vw,90px)" }}>
      <div className="wrap">
        <div className="eyebrow">Essays & build logs</div>
        <div className="sec-head" style={{ marginTop: 10 }}>
          <h2 className="serif">Blog</h2>
          <div className="rule" />
        </div>
        <div className="feed" style={{ marginTop: 22 }}>
          {posts.map((l) => (
            <Link key={l.slug} className="entry" href={`/blog/${l.slug}`}>
              <div className="d">{formatDate(l.date)}</div>
              <div className="entry-title serif">{l.title}</div>
              <p>{l.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
