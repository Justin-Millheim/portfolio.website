"use client";

import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import type { Recipe, RecipeIngredient, Tag, TagType, Difficulty } from "@/lib/recipes/types";
import { TAG_TYPES, TAG_TYPE_LABEL, TAG_PRESETS, sameTag, tagKey } from "@/lib/recipes/tags";
import { parseQuantity } from "@/lib/recipes/scale";
import { newId } from "@/lib/recipes/seed";
import TagPill from "./TagPill";

// Editor row mirrors RecipeIngredient but keeps quantity as raw text so partial
// input like "1 1/" doesn't get clobbered while typing; parsed on save.
interface IngRow { id: string; qtyText: string; unit: string; item: string; prep: string; }

function toRow(ing: RecipeIngredient): IngRow {
  return {
    id: ing.id,
    qtyText: ing.quantity == null ? "" : prettyNum(ing.quantity),
    unit: ing.unit,
    item: ing.item,
    prep: ing.prep ?? "",
  };
}
function prettyNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export default function RecipeForm({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: Recipe;
  isNew: boolean;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? "");
  const [prepTime, setPrepTime] = useState(initial.prepTime ? String(initial.prepTime) : "");
  const [cookTime, setCookTime] = useState(initial.cookTime ? String(initial.cookTime) : "");
  const [servings, setServings] = useState(String(initial.servings || 4));
  const [difficulty, setDifficulty] = useState<Difficulty | "">(initial.difficulty ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [rows, setRows] = useState<IngRow[]>(
    initial.ingredients.length ? initial.ingredients.map(toRow) : [blankRow()]
  );
  const [steps, setSteps] = useState<string[]>(initial.instructions.length ? initial.instructions : [""]);
  const [tags, setTags] = useState<Tag[]>(initial.tags);
  const [customType, setCustomType] = useState<TagType>("course");
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function blankRow(): IngRow { return { id: newId("i"), qtyText: "", unit: "", item: "", prep: "" }; }

  // ---- ingredient rows ----
  function updateRow(id: string, patch: Partial<IngRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() { setRows((rs) => [...rs, blankRow()]); }
  function removeRow(id: string) { setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs.map((r) => (r.id === id ? blankRow() : r)))); }

  // ---- steps ----
  function updateStep(i: number, val: string) { setSteps((s) => s.map((x, idx) => (idx === i ? val : x))); }
  function addStep() { setSteps((s) => [...s, ""]); }
  function removeStep(i: number) { setSteps((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : [""])); }
  function moveStep(i: number, dir: -1 | 1) {
    setSteps((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  // ---- tags ----
  function toggleTag(type: TagType, name: string) {
    const tag: Tag = { type, name: name.trim().toLowerCase() };
    setTags((cur) => (cur.some((t) => sameTag(t, tag)) ? cur.filter((t) => !sameTag(t, tag)) : [...cur, tag]));
  }
  function addCustomTag() {
    const name = customName.trim().toLowerCase();
    if (!name) return;
    const tag: Tag = { type: customType, name };
    if (!tags.some((t) => sameTag(t, tag))) setTags((cur) => [...cur, tag]);
    setCustomName("");
  }

  // ---- save ----
  function handleSave() {
    if (!title.trim()) { setError("Give your recipe a title."); window.scrollTo(0, 0); return; }
    const ingredients: RecipeIngredient[] = rows
      .filter((r) => r.item.trim() || r.qtyText.trim())
      .map((r) => ({
        id: r.id,
        quantity: parseQuantity(r.qtyText),
        unit: r.unit.trim(),
        item: r.item.trim(),
        prep: r.prep.trim() || undefined,
      }));
    const instructions = steps.map((s) => s.trim()).filter(Boolean);
    const now = new Date().toISOString();

    onSave({
      ...initial,
      title: title.trim(),
      description: description.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      prepTime: prepTime ? Math.max(0, parseInt(prepTime, 10)) || undefined : undefined,
      cookTime: cookTime ? Math.max(0, parseInt(cookTime, 10)) || undefined : undefined,
      servings: Math.max(1, parseInt(servings, 10) || 1),
      difficulty: difficulty || undefined,
      notes: notes.trim() || undefined,
      ingredients,
      instructions,
      tags,
      updatedAt: now,
      createdAt: initial.createdAt || now,
    });
  }

  return (
    <div className="r-wrap r-fadein" style={{ paddingTop: 18 }}>
      <div className="r-accent-tr" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button className="r-btn r-btn-quiet" onClick={onCancel} style={{ paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Cancel
        </button>
        <button className="r-btn r-btn-primary" onClick={handleSave}>{isNew ? "Save recipe" : "Save changes"}</button>
      </div>
      <h1 style={{ fontSize: 26, marginBottom: 18 }}>{isNew ? "New recipe" : "Edit recipe"}</h1>
      {error && <p style={{ color: "var(--r-tomato-dk)", fontSize: 14, marginBottom: 14 }}>{error}</p>}

      {/* basics */}
      <div className="r-field">
        <label className="r-label">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chicken Pot Pie" />
      </div>
      <div className="r-field">
        <label className="r-label">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short blurb…" rows={2} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div className="r-field">
          <label className="r-label">Prep (min)</label>
          <input type="number" inputMode="numeric" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="20" />
        </div>
        <div className="r-field">
          <label className="r-label">Cook (min)</label>
          <input type="number" inputMode="numeric" value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="40" />
        </div>
        <div className="r-field">
          <label className="r-label">Servings</label>
          <input type="number" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
        </div>
      </div>
      <div className="r-field">
        <label className="r-label">Difficulty</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}>
          <option value="">—</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* ingredients */}
      <h2 className="r-section-title">Ingredients</h2>
      <p style={{ fontSize: 12, color: "var(--r-faint)", margin: "0 0 10px" }}>
        Quantity accepts decimals or fractions (e.g. <span className="r-mono">1 1/2</span>). Leave it blank for
        “to taste”.
      </p>
      {rows.map((r) => (
        <div key={r.id} className="r-row r-ing-row">
          <input type="text" inputMode="decimal" value={r.qtyText} onChange={(e) => updateRow(r.id, { qtyText: e.target.value })} placeholder="qty" aria-label="Quantity" />
          <input type="text" value={r.unit} onChange={(e) => updateRow(r.id, { unit: e.target.value })} placeholder="unit" aria-label="Unit" />
          <input type="text" value={r.item} onChange={(e) => updateRow(r.id, { item: e.target.value })} placeholder="ingredient" aria-label="Ingredient" />
          <input className="r-ing-prep" type="text" value={r.prep} onChange={(e) => updateRow(r.id, { prep: e.target.value })} placeholder="prep note (e.g. diced)" aria-label="Prep note" />
          <button className="r-row-x" onClick={() => removeRow(r.id)} aria-label="Remove ingredient">×</button>
        </div>
      ))}
      <button className="r-btn r-btn-ghost" onClick={addRow} style={{ marginTop: 4 }}><Plus size={15} /> Add ingredient</button>

      {/* steps */}
      <h2 className="r-section-title">Instructions</h2>
      {steps.map((s, i) => (
        <div key={i} className="r-row r-step-row" style={{ gridTemplateColumns: "auto 1fr auto", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button className="r-row-x" style={{ height: 22, fontSize: 11, color: "var(--r-muted)" }} onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
            <button className="r-row-x" style={{ height: 22, fontSize: 11, color: "var(--r-muted)" }} onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} aria-label="Move down">▼</button>
          </div>
          <textarea value={s} onChange={(e) => updateStep(i, e.target.value)} placeholder={`Step ${i + 1}`} rows={2} style={{ minHeight: 52 }} />
          <button className="r-row-x" onClick={() => removeStep(i)} aria-label="Remove step">×</button>
        </div>
      ))}
      <button className="r-btn r-btn-ghost" onClick={addStep} style={{ marginTop: 4 }}><Plus size={15} /> Add step</button>

      {/* tags — the §5 categorization engine */}
      <h2 className="r-section-title">Tags</h2>
      {tags.length > 0 && (
        <div className="r-chips" style={{ marginBottom: 14 }}>
          {tags.map((t) => <TagPill key={tagKey(t)} tag={t} onRemove={() => toggleTag(t.type, t.name)} />)}
        </div>
      )}
      {TAG_TYPES.map((type) => (
        <div key={type} className="r-filter-group" style={{ marginBottom: 10 }}>
          <span className="r-type-label">{TAG_TYPE_LABEL[type]}</span>
          {TAG_PRESETS[type].map((name) => {
            const on = tags.some((t) => sameTag(t, { type, name }));
            return (
              <button key={name} className={`r-chip${on ? " active" : ""}`} onClick={() => toggleTag(type, name)}>
                {name}
              </button>
            );
          })}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={customType} onChange={(e) => setCustomType(e.target.value as TagType)} style={{ width: "auto", minWidth: 150 }}>
          {TAG_TYPES.map((t) => <option key={t} value={t}>{TAG_TYPE_LABEL[t]}</option>)}
        </select>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
          placeholder="custom tag…"
          style={{ width: "auto", flex: 1, minWidth: 140 }}
        />
        <button className="r-btn r-btn-ghost" onClick={addCustomTag}><Plus size={15} /> Add tag</button>
      </div>

      {/* extras */}
      <h2 className="r-section-title">More</h2>
      <div className="r-field">
        <label className="r-label">Source URL</label>
        <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="r-field">
        <label className="r-label">Personal notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Doubled the garlic; baked 5 min longer…" rows={3} />
      </div>

      <hr className="r-divider" />
      <div style={{ display: "flex", gap: 10 }}>
        <button className="r-btn r-btn-quiet r-btn-block" onClick={onCancel}>Cancel</button>
        <button className="r-btn r-btn-primary r-btn-block" onClick={handleSave}>{isNew ? "Save recipe" : "Save changes"}</button>
      </div>
    </div>
  );
}
