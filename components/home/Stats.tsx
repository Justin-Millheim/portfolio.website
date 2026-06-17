"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { stats } from "@/content/stats";

function Counter({ value, suffix, start, reduce }: { value: number; suffix: string; start: boolean; reduce: boolean }) {
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    if (!start) return;
    let raf = 0;
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value, reduce]);
  return (
    <span className="num">
      {n}
      {suffix}
    </span>
  );
}

// Quantified-impact band. Numbers count up the first time the band scrolls
// into view (IntersectionObserver), then stop. Final values render immediately
// when reduced motion is requested.
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
    <section className="stats" aria-label="Impact by the numbers">
      <div className="wrap">
        <div className="stats-inner" ref={ref}>
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <Counter value={s.value} suffix={s.suffix} start={start} reduce={!!reduce} />
              <div className="lab">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
