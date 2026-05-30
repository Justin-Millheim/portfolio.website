"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Quote } from "lucide-react";
import { testimonials } from "@/content/testimonials";

const ROTATE_MS = 7000;

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const n = testimonials.length;

  useEffect(() => {
    if (paused || n <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % n), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, n]);

  if (n === 0) return null;
  const t = testimonials[i];

  return (
    <div
      className="quotes"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="eyebrow" style={{ textAlign: "center", marginBottom: 20 }}>
        What coworkers say
      </div>
      <div className="quote-stage">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={i}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Quote className="qmark" size={24} />
            <p className="quote-text">{t.quote}</p>
            <footer>
              <Image
                className="q-photo"
                src={t.photo}
                alt={t.name}
                width={54}
                height={54}
              />
              <div className="q-meta">
                <span className="q-name">{t.name}</span>
                <span className="q-title">{t.title}</span>
                <span className="q-rel">{t.relation}</span>
              </div>
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>
      <div className="dots">
        {testimonials.map((_, d) => (
          <button
            key={d}
            aria-label={`Show recommendation ${d + 1}`}
            className={`qdot${d === i ? " on" : ""}`}
            onClick={() => setI(d)}
          />
        ))}
      </div>
    </div>
  );
}
