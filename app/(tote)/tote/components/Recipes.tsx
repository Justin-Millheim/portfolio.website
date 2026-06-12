"use client";

import { useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2, Users, ShoppingCart } from "lucide-react";
import type { GroceryList, ToteRecipe, RecipeLine } from "@/lib/tote/types";
import { categoryMeta } from "@/lib/tote/categories";
import { categorize } from "@/lib/tote/catalog";
import { newItem, emptyRecipe, newId, emptyList } from "@/lib/tote/seed";
import { useConfirm } from "./ConfirmProvider";
import TopBar from "./TopBar";
import ListPickerSheet from "./ListPickerSheet";

type Mode = { kind: "list" } | { kind: "view"; id: string } | { kind: "edit"; draft: ToteRecipe; isNew: boolean };

export default function Recipes({
  recipes, lists, userId, onSave, onRemove, onSaveList,
}: {
  recipes: ToteRecipe[];
  lists: GroceryList[];
  userId: string;
  onSave: (r: ToteRecipe) => void;
  onRemove: (id: string) => void;
  onSaveList: (l: GroceryList) => void;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const { confirm, toast } = useConfirm();

  if (mode.kind === "edit") {
    return <Editor draft={mode.draft} isNew={mode.isNew}
      onCancel={() => setMode(mode.isNew ? { kind: "list" } : { kind: "view", id: mode.draft.id })}
      onSave={(r) => { onSave(r); setMode({ kind: "view", id: r.id }); }} />;
  }

  if (mode.kind === "view") {
    const recipe = recipes.find((r) => r.id === mode.id);
    if (!recipe) return <ListView recipes={recipes} onOpen={(id) => setMode({ kind: "view", id })} onNew={() => setMode({ kind: "edit", draft: emptyRecipe(userId), isNew: true })} />;
    return (
      <View
        recipe={recipe}
        lists={lists}
        onBack={() => setMode({ kind: "list" })}
        onEdit={() => setMode({ kind: "edit", draft: recipe, isNew: false })}
        onSaveList={onSaveList}
        userId={userId}
        confirm={confirm}
        toast={toast}
        onDelete={async () => {
          const r = await confirm({ title: `Delete “${recipe.name}”?`, confirmLabel: "Delete", cancelLabel: "Cancel", danger: true });
          if (r === "confirm") { onRemove(recipe.id); setMode({ kind: "list" }); }
        }}
      />
    );
  }

  return <ListView recipes={recipes} onOpen={(id) => setMode({ kind: "view", id })} onNew={() => setMode({ kind: "edit", draft: emptyRecipe(userId), isNew: true })} />;
}

// ---- recipe list ----
function ListView({ recipes, onOpen, onNew }: { recipes: ToteRecipe[]; onOpen: (id: string) => void; onNew: () => void }) {
  return (
    <>
      <TopBar
        left={<div><h1>Recipes</h1><div className="t-sub">{recipes.length} saved</div></div>}
        right={<button className="t-fab" aria-label="New recipe" onClick={onNew}><Plus size={20} /></button>}
      />
      <div className="t-app t-scroll t-fadein">
        {recipes.length === 0 ? (
          <div className="t-empty">
            <div className="t-emoji">📖</div>
            <p style={{ fontSize: 17, marginBottom: 4 }}>No recipes yet.</p>
            <p style={{ fontSize: 14, marginBottom: 18 }}>Save a recipe to add its ingredients to a list in one tap.</p>
            <button className="t-btn t-btn-primary" onClick={onNew}><Plus size={16} /> New recipe</button>
          </div>
        ) : (
          recipes.map((r) => (
            <div key={r.id} className="t-card t-tap-card" style={{ marginBottom: 10 }} onClick={() => onOpen(r.id)}>
              <h3 style={{ fontSize: 17 }}>{r.name || "Untitled recipe"}</h3>
              <div style={{ display: "flex", gap: 14, marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                <span><Users size={13} style={{ verticalAlign: "-2px" }} /> {r.servings}</span>
                <span>{r.lines.length} ingredient{r.lines.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ---- recipe view with scaler + add-to-list ----
function View({
  recipe, lists, userId, onBack, onEdit, onDelete, onSaveList, confirm, toast,
}: {
  recipe: ToteRecipe;
  lists: GroceryList[];
  userId: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveList: (l: GroceryList) => void;
  confirm: ReturnType<typeof useConfirm>["confirm"];
  toast: (m: string) => void;
}) {
  const [servings, setServings] = useState(recipe.servings || 1);
  const [picking, setPicking] = useState(false);
  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;

  function addToList(listId: string) {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const items = recipe.lines.filter((l) => l.item.trim()).map((l) => {
      const qty = l.quantity == null ? "" : `${trimNum(l.quantity * factor)}${l.unit ? " " + l.unit : ""}`.trim();
      const it = newItem(l.item, qty);
      return { ...it, category: l.category };
    });
    onSaveList({ ...list, items: [...list.items, ...items], updatedAt: new Date().toISOString() });
    toast(`Added ${items.length} to ${list.name}`);
  }

  function createListAndAdd() {
    const list = emptyList(userId, recipe.name || "Groceries");
    const items = recipe.lines.filter((l) => l.item.trim()).map((l) => {
      const qty = l.quantity == null ? "" : `${trimNum(l.quantity * factor)}${l.unit ? " " + l.unit : ""}`.trim();
      const it = newItem(l.item, qty);
      return { ...it, category: l.category };
    });
    onSaveList({ ...list, items });
    toast(`Added ${items.length} to ${list.name}`);
  }

  return (
    <>
      <TopBar
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <button className="t-iconbtn" aria-label="Back" onClick={onBack} style={{ width: 34, height: 34 }}><ChevronLeft size={18} /></button>
            <h1 style={{ fontSize: 20, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{recipe.name || "Untitled"}</h1>
          </div>
        }
        right={
          <>
            <button className="t-iconbtn" aria-label="Edit" onClick={onEdit}><Pencil size={16} /></button>
            <button className="t-iconbtn" aria-label="Delete" onClick={onDelete}><Trash2 size={16} /></button>
          </>
        }
      />
      <div className="t-app t-scroll t-fadein">
        {/* scaler */}
        <div className="t-card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Users size={18} style={{ color: "var(--muted)" }} />
          <button className="t-iconbtn" onClick={() => setServings((s) => Math.max(1, s - 1))} disabled={servings <= 1} aria-label="Fewer">−</button>
          <span style={{ fontSize: 20, fontWeight: 800, minWidth: 24, textAlign: "center" }}>{servings}</span>
          <button className="t-iconbtn" onClick={() => setServings((s) => Math.min(99, s + 1))} aria-label="More">+</button>
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>servings</span>
          {servings !== recipe.servings && (
            <button className="t-link" style={{ marginLeft: "auto", fontSize: 12.5 }} onClick={() => setServings(recipe.servings)}>reset</button>
          )}
        </div>

        <button className="t-btn t-btn-accent t-btn-block" onClick={() => (lists.length ? setPicking(true) : createListAndAdd())}>
          <ShoppingCart size={17} /> Add ingredients to a list
        </button>

        <div className="t-section-title">Ingredients</div>
        {recipe.lines.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No ingredients.</p>
        ) : (
          recipe.lines.map((l) => {
            const qty = l.quantity == null ? "" : `${trimNum(l.quantity * factor)}${l.unit ? " " + l.unit : ""}`.trim();
            return (
              <div key={l.id} className="t-item" style={{ cursor: "default" }}>
                <span style={{ fontSize: 16 }}>{categoryMeta(l.category).emoji}</span>
                <div className="t-item-body">
                  <div className="t-item-name" style={{ fontWeight: 600 }}>{l.item}</div>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 14, fontWeight: 700 }}>{qty || "—"}</div>
              </div>
            );
          })
        )}

        {recipe.steps.length > 0 && (
          <>
            <div className="t-section-title">Steps</div>
            <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.6, fontSize: 15 }}>
              {recipe.steps.map((s, i) => <li key={i} style={{ marginBottom: 8 }}>{s}</li>)}
            </ol>
          </>
        )}

        {recipe.note && (
          <>
            <div className="t-section-title">Notes</div>
            <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{recipe.note}</p>
          </>
        )}
      </div>

      {picking && (
        <ListPickerSheet
          lists={lists}
          title="Add ingredients to…"
          onPick={addToList}
          onCreate={createListAndAdd}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

// ---- recipe editor ----
interface LineRow { id: string; qtyText: string; unit: string; item: string; }

function Editor({
  draft, isNew, onSave, onCancel,
}: {
  draft: ToteRecipe;
  isNew: boolean;
  onSave: (r: ToteRecipe) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(draft.name);
  const [servings, setServings] = useState(String(draft.servings || 4));
  const [note, setNote] = useState(draft.note ?? "");
  const [rows, setRows] = useState<LineRow[]>(
    draft.lines.length ? draft.lines.map((l) => ({ id: l.id, qtyText: l.quantity == null ? "" : trimNum(l.quantity), unit: l.unit, item: l.item })) : [blank()]
  );
  const [steps, setSteps] = useState<string[]>(draft.steps.length ? draft.steps : [""]);
  const [error, setError] = useState<string | null>(null);

  function blank(): LineRow { return { id: newId("rl"), qtyText: "", unit: "", item: "" }; }

  function save() {
    if (!name.trim()) { setError("Give the recipe a name."); return; }
    const lines: RecipeLine[] = rows.filter((r) => r.item.trim()).map((r) => {
      const q = r.qtyText.trim();
      const num = q === "" ? null : parseNum(q);
      return { id: r.id, quantity: num, unit: r.unit.trim(), item: r.item.trim(), category: categorize(r.item) };
    });
    const now = new Date().toISOString();
    onSave({
      ...draft,
      name: name.trim(),
      servings: Math.max(1, parseInt(servings, 10) || 1),
      lines,
      steps: steps.map((s) => s.trim()).filter(Boolean),
      note: note.trim() || undefined,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    });
  }

  return (
    <>
      <TopBar
        left={<button className="t-btn t-btn-quiet" onClick={onCancel} style={{ paddingLeft: 0 }}><ChevronLeft size={16} /> Cancel</button>}
        right={<button className="t-btn t-btn-primary" onClick={save}>{isNew ? "Save" : "Save changes"}</button>}
      />
      <div className="t-app t-scroll t-fadein">
        <h1 style={{ fontSize: 24, marginBottom: 14 }}>{isNew ? "New recipe" : "Edit recipe"}</h1>
        {error && <p style={{ color: "var(--coral-dk)", fontSize: 14, marginBottom: 12 }}>{error}</p>}

        <div className="t-field">
          <label className="t-label">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sheet-Pan Chicken" />
        </div>
        <div className="t-field" style={{ maxWidth: 160 }}>
          <label className="t-label">Servings</label>
          <input type="number" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
        </div>

        <div className="t-section-title">Ingredients</div>
        {rows.map((r) => (
          <div key={r.id} className="t-row t-line-row">
            <input type="text" inputMode="decimal" value={r.qtyText} onChange={(e) => upd(r.id, { qtyText: e.target.value })} placeholder="qty" aria-label="Quantity" />
            <input type="text" value={r.unit} onChange={(e) => upd(r.id, { unit: e.target.value })} placeholder="unit" aria-label="Unit" />
            <input type="text" value={r.item} onChange={(e) => upd(r.id, { item: e.target.value })} placeholder="ingredient" aria-label="Ingredient" />
            <button className="t-rowx" onClick={() => removeRow(r.id)} aria-label="Remove">×</button>
          </div>
        ))}
        <button className="t-btn t-btn-ghost" onClick={() => setRows((rs) => [...rs, blank()])} style={{ marginTop: 4 }}><Plus size={15} /> Add ingredient</button>

        <div className="t-section-title">Steps</div>
        {steps.map((s, i) => (
          <div key={i} className="t-row" style={{ gridTemplateColumns: "1fr 36px", alignItems: "start" }}>
            <textarea value={s} onChange={(e) => setSteps((ss) => ss.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={`Step ${i + 1}`} rows={2} style={{ minHeight: 48 }} />
            <button className="t-rowx" onClick={() => setSteps((ss) => (ss.length > 1 ? ss.filter((_, idx) => idx !== i) : [""]))} aria-label="Remove step">×</button>
          </div>
        ))}
        <button className="t-btn t-btn-ghost" onClick={() => setSteps((ss) => [...ss, ""])} style={{ marginTop: 4 }}><Plus size={15} /> Add step</button>

        <div className="t-field" style={{ marginTop: 22 }}>
          <label className="t-label">Notes</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Doubled the garlic…" rows={3} />
        </div>

        <hr className="t-divider" />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="t-btn t-btn-quiet t-btn-block" onClick={onCancel}>Cancel</button>
          <button className="t-btn t-btn-primary t-btn-block" onClick={save}>{isNew ? "Save recipe" : "Save changes"}</button>
        </div>
      </div>
    </>
  );

  function upd(id: string, patch: Partial<LineRow>) { setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function removeRow(id: string) { setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blank()])); }
}

// quantity helpers (numbers + simple fractions)
function parseNum(s: string): number | null {
  const t = s.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t);
  return isFinite(n) ? n : null;
}
function trimNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}
