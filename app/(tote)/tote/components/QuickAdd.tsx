"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { parseQuickAdd, suggestItems } from "@/lib/tote/parse";
import { categorize } from "@/lib/tote/catalog";
import { categoryMeta } from "@/lib/tote/categories";

// The AnyList-style add bar: type "2 lb chicken", press Enter (or tap a
// suggestion) and it's parsed + auto-categorized. Suggestions blend the
// built-in catalog with the user's own recent item names.
export default function QuickAdd({
  recents,
  onAdd,
}: {
  recents: string[];
  onAdd: (name: string, quantity: string) => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const parsed = parseQuickAdd(value);
  const suggestions = focused && parsed.name ? suggestItems(parsed.name, recents) : [];

  function commit(name: string, quantity: string) {
    if (!name.trim()) return;
    onAdd(name.trim(), quantity.trim());
    setValue("");
  }

  return (
    <div className="t-quickadd">
      <div className="t-quickadd-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(parsed.name, parsed.quantity); }}
          placeholder="Add item — try “2 lb chicken”"
          aria-label="Add an item"
          autoCapitalize="none"
        />
        <button className="t-fab" aria-label="Add item" onMouseDown={(e) => e.preventDefault()} onClick={() => commit(parsed.name, parsed.quantity)}>
          <Plus size={20} />
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="t-suggest">
          {suggestions.map((s) => {
            const meta = categoryMeta(categorize(s));
            return (
              <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => commit(s, parsed.quantity)}>
                <span className="t-cat-emoji">{meta.emoji}</span>
                <span style={{ flex: 1 }}>
                  {parsed.quantity && <span style={{ color: "var(--muted)", fontWeight: 700 }}>{parsed.quantity} </span>}
                  {s}
                </span>
                <span className="t-pill">{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
