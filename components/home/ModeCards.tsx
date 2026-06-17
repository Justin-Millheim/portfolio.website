"use client";

import { useRef } from "react";
import { Boxes, Users, Sparkles, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import ContentLink from "@/components/ContentLink";
import { staggerContainer, staggerItem } from "@/lib/motion";

type Mode = { icon: LucideIcon; title: string; line: string; href: string };

const modes: Mode[] = [
  { icon: Boxes, title: "Builder", line: "Tools, systems, and side projects I can not leave alone, built to make the work better.", href: "/blog/what-builder-means" },
  { icon: Users, title: "Connector", line: "Communities, events, and experiences I design so people do their best work together.", href: "/blog/what-connector-means" },
  { icon: Sparkles, title: "AI Enthusiast", line: "All-in on agentic AI: Claude Skills, MCP, and the workflows reshaping how product gets built.", href: "/blog/what-ai-enthusiast-means" },
];

function Card({ m }: { m: Mode }) {
  const Icon = m.icon;
  return (
    <ContentLink className="mode" to={m.href} kind="mode_card" label={m.title}>
      <div className="ic">
        <Icon size={22} />
      </div>
      <h3>{m.title}</h3>
      <p>{m.line}</p>
      <span className="more">
        explore <ArrowRight size={13} />
      </span>
    </ContentLink>
  );
}

// Wraps a card with cursor-tracking 3D tilt. Sets CSS vars the .mode rule
// consumes for rotateX/rotateY. No tilt for reduced-motion users.
function Tilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(px * 8).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className="tilt" onMouseMove={onMove} onMouseLeave={reset}>
      {children}
    </div>
  );
}

export default function ModeCards() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="modes">
        {modes.map((m) => (
          <Card key={m.title} m={m} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="modes"
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {modes.map((m) => (
        <motion.div key={m.title} variants={staggerItem}>
          <Tilt>
            <Card m={m} />
          </Tilt>
        </motion.div>
      ))}
    </motion.div>
  );
}
