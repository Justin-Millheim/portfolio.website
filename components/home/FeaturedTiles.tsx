"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import ContentLink from "@/components/ContentLink";
import type { Project } from "@/content/projects";
import { staggerContainer, staggerItem } from "@/lib/motion";

function Tile({ p }: { p: Project }) {
  const to = p.post ? `/blog/${p.post}` : "/projects";
  return (
    <ContentLink className="tile tile--cover" to={to} kind="featured_tile" label={p.title}>
      {p.cover && (
        <span className="tile-cover">
          <Image src={p.cover} alt="" fill sizes="(max-width:560px) 100vw, 340px" unoptimized />
        </span>
      )}
      <span className="tile-body">
        <span className="dom">{p.tags.join(" · ")}</span>
        <h4>{p.title}</h4>
        <p>{p.blurb}</p>
        <span className="go">
          <ArrowUpRight size={17} />
        </span>
      </span>
    </ContentLink>
  );
}

export default function FeaturedTiles({ items }: { items: Project[] }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="grid">
        {items.map((p) => (
          <Tile key={p.id} p={p} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid"
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {items.map((p) => (
        <motion.div key={p.id} variants={staggerItem} style={{ height: "100%" }}>
          <Tile p={p} />
        </motion.div>
      ))}
    </motion.div>
  );
}
