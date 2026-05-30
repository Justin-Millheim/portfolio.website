"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { testimonials } from "@/content/testimonials";

const ROTATE_MS = 10500;

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const n = testimonials.length;
  const touchX = useRef(0);

  const go = (d: number) => {
    setDir(d);
    setI((p) => (p + d + n) % n);
  };
  const jump = (to: number) => {
    setDir(to > i ? 1 : -1);
    setI(to);
  };

  useEffect(() => {
    if (paused || n <= 1) return;
    const id = setInterval(() => {
      setDir(1);
      setI((p) => (p + 1) % n);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, n]);

  if (n === 0) return null;
  const t = testimonials[i];
  const x = 90;

  return (
    <div className="quotes" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="eyebrow" style={{ textAlign: "center", marginBottom: 20 }}>
        What coworkers say
      </div>
      <div className="quotes-row">
        <button className="quote-arrow" aria-label="Previous recommendation" onClick={() => go(-1)}>
          <ChevronLeft size={20} />
        </button>
        <div
          className="quote-stage"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
            setPaused(true);
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
        >
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={i}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? x : -x }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? -x : x }}
              transition={{ duration: reduce ? 0.15 : 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <Quote className="qmark" size={24} />
              <p className="quote-text">{t.quote}</p>
              <footer>
                <Image className="q-photo" src={t.photo} alt={t.name} width={54} height={54} />
                <div className="q-meta">
                  <span className="q-name">{t.name}</span>
                  <span className="q-title">{t.title}</span>
                  <span className="q-rel">{t.relation}</span>
                </div>
              </footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
        <button className="quote-arrow" aria-label="Next recommendation" onClick={() => go(1)}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="dots">
        {testimonials.map((_, d) => (
          <button
            key={d}
            aria-label={`Show recommendation ${d + 1}`}
            className={`qdot${d === i ? " on" : ""}`}
            onClick={() => jump(d)}
          />
        ))}
      </div>
    </div>
  );
}
