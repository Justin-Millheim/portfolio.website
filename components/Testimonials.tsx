"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote } from "lucide-react";
import { testimonials } from "@/content/testimonials";

const ROTATE_MS = 5500;

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
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
      <div className="eyebrow" style={{ textAlign: "center", marginBottom: 18 }}>
        What coworkers say
      </div>
      <div className="quote-stage">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Quote className="qmark" size={24} />
            <p className="quote-text">{t.quote}</p>
            <footer>
              <span className="q-name">{t.name}</span>
              <span className="q-title">{t.title}</span>
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>
      <div className="dots">
        {testimonials.map((_, d) => (
          <button
            key={d}
            aria-label={`Show testimonial ${d + 1}`}
            className={`qdot${d === i ? " on" : ""}`}
            onClick={() => setI(d)}
          />
        ))}
      </div>
    </div>
  );
}
