"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { ShoppingCart, Plus } from "lucide-react";
import type { GroceryList } from "@/lib/tote/types";

// Bottom sheet to choose which list to send items to (or create a new one).
export default function ListPickerSheet({
  lists, title, onPick, onCreate, onClose,
}: {
  lists: GroceryList[];
  title: string;
  onPick: (listId: string) => void;
  onCreate: () => void;     // create a new list, then caller resolves target
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="t-sheet-backdrop" onClick={onClose}>
      <div className="t-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {lists.map((l) => (
          <button key={l.id} className="t-sheet-item" onClick={() => { onPick(l.id); onClose(); }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--teal-soft)", color: "var(--teal-dk)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingCart size={17} />
            </span>
            <span style={{ flex: 1, fontWeight: 600 }}>{l.name}</span>
            <span className="t-pill">{l.items.length}</span>
          </button>
        ))}
        <button className="t-sheet-item" onClick={() => { onCreate(); onClose(); }} style={{ color: "var(--teal-dk)", fontWeight: 700 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={17} />
          </span>
          New list…
        </button>
      </div>
    </div>,
    document.body
  );
}
