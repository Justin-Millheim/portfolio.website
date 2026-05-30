import fs from "fs";
import path from "path";
import matter from "gray-matter";

const LOG_DIR = path.join(process.cwd(), "content/log");

export type LogMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function getLogPosts(): LogMeta[] {
  if (!fs.existsSync(LOG_DIR)) return [];
  const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(".mdx"));
  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(LOG_DIR, file), "utf8");
    const { data } = matter(raw);
    return {
      slug,
      title: String(data.title ?? slug),
      date: String(data.date ?? ""),
      excerpt: String(data.excerpt ?? ""),
    };
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
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
    },
    content,
  };
}
