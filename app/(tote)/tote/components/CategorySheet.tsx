"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Category } from "@/lib/tote/types";
import { CATEGORIES } from "@/lib/tote/categories";

// Bottom sheet for re-filing an item into a different aisle — the AnyList touch
// of tapping a category to correct it. Rendered through a body portal so it
// overlays everything regardless of scroll position.
export default function CategorySheet({
  title, current, onPick, onClose,
}: {
  title: string;
  current: Category;
  onPick: (c: Category) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="t-sheet-backdrop" onClick={onClose}>
      <div className="t-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Aisle for “{title}”</h3>
        {CATEGORIES.map((c) => (
          <button key={c.id} className="t-sheet-item" onClick={() => { onPick(c.id); onClose(); }}>
            <span style={{ fontSize: 18 }}>{c.emoji}</span>
            <span style={{ flex: 1, fontWeight: c.id === current ? 800 : 500 }}>{c.label}</span>
            {c.id === current && <Check size={17} color="var(--teal)" />}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
