"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { stats, type Stat } from "@/content/stats";

function format(n: number, s: Stat) {
  return `${s.prefix ?? ""}${n.toFixed(s.decimals ?? 0)}${s.suffix ?? ""}`;
}

function Counter({ s, start, reduce }: { s: Stat; start: boolean; reduce: boolean }) {
  const [n, setN] = useState(reduce ? s.value : 0);
  useEffect(() => {
    if (reduce) {
      setN(s.value);
      return;
    }
    if (!start) return;
    let raf = 0;
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(eased * s.value);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(s.value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, reduce, s.value]);
  return <span className="num">{format(n, s)}</span>;
}

// Quantified-impact band. Numbers count up the first time the band scrolls
// into view, then settle. Final values render immediately for reduced motion.
export default function Stats() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStart(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="stats" aria-label="Selected outcomes">
      <div className="wrap">
        <div className="eyebrow stats-eyebrow">Selected outcomes</div>
        <div className="stats-inner" ref={ref}>
          {stats.map((s) => (
            <div className={`stat${start || reduce ? " in" : ""}`} key={s.label}>
              <Counter s={s} start={start} reduce={!!reduce} />
              <div className="lab">{s.label}</div>
              {s.source && <div className="src">{s.source}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
