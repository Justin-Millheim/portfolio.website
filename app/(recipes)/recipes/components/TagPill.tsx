"use client";

import type { Tag } from "@/lib/recipes/types";

// Small colored tag chip, tinted by tag type (course/ingredient/dish/...).
export default function TagPill({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span className={`r-tag ${tag.type}`}>
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${tag.name}`}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1 }}
        >
          ✕
        </button>
      )}
    </span>
  );
}
