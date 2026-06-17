import Image from "next/image";
import ContentLink from "@/components/ContentLink";
import type { Project } from "@/content/projects";

// One flagship project shown large (image + outcome) to break the grid rhythm
// and give the page a feature moment. Swap p.cover for a real screenshot.
export default function FeatureSpot({ p, metric }: { p: Project; metric?: string }) {
  const to = p.post ? `/blog/${p.post}` : "/projects";
  return (
    <ContentLink className="feature" to={to} kind="feature_spot" label={p.title}>
      <span className="feature__media">
        {p.cover && <Image src={p.cover} alt="" fill sizes="(max-width:760px) 100vw, 640px" unoptimized />}
      </span>
      <span className="feature__body">
        <span className="dom">{p.tags.join(" · ")}</span>
        <h3 className="serif">{p.title}</h3>
        <p>{p.blurb}</p>
        {metric && <span className="feature__metric">{metric}</span>}
        <span className="more">Read the build →</span>
      </span>
    </ContentLink>
  );
}
