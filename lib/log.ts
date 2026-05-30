import fs from "fs";
import path from "path";
import matter from "gray-matter";

const LOG_DIR = path.join(process.cwd(), "content/blog");

export type LogMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  hidden?: boolean;
};

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function readMeta(file: string): LogMeta {
  const slug = file.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(LOG_DIR, file), "utf8");
  const { data } = matter(raw);
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ""),
    excerpt: String(data.excerpt ?? ""),
    hidden: Boolean(data.hidden ?? false),
  };
}

// Every slug, including hidden ones (for static generation + direct access).
export function getAllSlugs(): string[] {
  if (!fs.existsSync(LOG_DIR)) return [];
  return fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
}

// Posts for listing/feeds — excludes hidden, sorted newest-first.
export function getLogPosts(): LogMeta[] {
  if (!fs.existsSync(LOG_DIR)) return [];
  return fs
    .readdirSync(LOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map(readMeta)
    .filter((p) => !p.hidden)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getLogPost(slug: string): { meta: LogMeta; content: string } {
  const raw = fs.readFileSync(path.join(LOG_DIR, `${slug}.mdx`), "utf8");
  const { data, content } = matter(raw);
  return {
    meta: {
      slug,
      title: String(data.title ?? slug),
      date: String(data.date ?? ""),
      excerpt: String(data.excerpt ?? ""),
      hidden: Boolean(data.hidden ?? false),
    },
    content,
  };
}
