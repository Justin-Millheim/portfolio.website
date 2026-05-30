"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Img = { src: string; alt?: string };
const Ctx = createContext<{ open: (img: Img) => void }>({ open: () => {} });
export const useLightbox = () => useContext(Ctx);

export default function LightboxProvider({ children }: { children: ReactNode }) {
  const [img, setImg] = useState<Img | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const close = useCallback(() => setImg(null), []);

  useEffect(() => {
    if (!img) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [img, close]);

  return (
    <Ctx.Provider value={{ open: (i) => setImg(i) }}>
      {children}
      {mounted && img
        ? createPortal(
            <div className="lightbox" onClick={close}>
              <button className="lightbox-close" aria-label="Close" onClick={close}>
                <X size={22} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt || ""} onClick={(e) => e.stopPropagation()} />
            </div>,
            document.body
          )
        : null}
    </Ctx.Provider>
  );
}
