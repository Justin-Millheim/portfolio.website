"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Clock, Users, X } from "lucide-react";
import type { Recipe, RecipeFilter, Tag, TagType } from "@/lib/recipes/types";
import { collectTags, TAG_TYPES, TAG_TYPE_LABEL, sameTag } from "@/lib/recipes/tags";
import { filterRecipes } from "@/lib/recipes/search";
import { totalTime, formatMinutes } from "@/lib/recipes/format";
import TagPill from "./TagPill";

type Account = { mode: "guest" | "cloud"; email?: string };

const TIME_CAPS = [15, 30, 45, 60];

export default function Library({
  recipes,
  onOpen,
  onNew,
  account,
  onSignIn,
  onSignOut,
}: {
  recipes: Recipe[];
  onOpen: (id: string) => void;
  onNew: () => void;
  account: Account | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [maxTotalTime, setMaxTotalTime] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const available = useMemo(() => collectTags(recipes), [recipes]);
  const filter: RecipeFilter = { query, tags, maxTotalTime };
  const shown = useMemo(() => filterRecipes(recipes, filter), [recipes, query, tags, maxTotalTime]);

  const activeTypes = TAG_TYPES.filter((t) => available[t].length > 0);
  const hasFilters = tags.length > 0 || maxTotalTime != null;

  function toggleTag(type: TagType, name: string) {
    const tag: Tag = { type, name };
    setTags((cur) => (cur.some((t) => sameTag(t, tag)) ? cur.filter((t) => !sameTag(t, tag)) : [...cur, tag]));
  }
  function clearAll() { setTags([]); setMaxTotalTime(null); }

  return (
    <>
      <header className="r-topbar">
        <div className="r-brand">
          <b>Mise</b>
          <span className="r-mono" style={{ fontSize: 11, color: "var(--r-faint)" }}>RECIPE BOX</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {account?.mode === "cloud" ? (
            <button className="r-btn r-btn-quiet" onClick={onSignOut} title={account.email}>Sign out</button>
          ) : (
            <button className="r-btn r-btn-quiet" onClick={onSignIn}>Sign in</button>
          )}
          <button className="r-btn r-btn-accent" onClick={onNew}><Plus size={16} /> Add</button>
        </div>
      </header>

      <div className="r-wrap r-fadein" style={{ paddingTop: 18 }}>
        <div className="r-accent-tr" />

        {/* search + filter toggle */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="r-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search recipes, ingredients, tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className={`r-chip${hasFilters ? " active" : ""}`}
            onClick={() => setShowFilters((s) => !s)}
            style={{ flexShrink: 0 }}
          >
            Filters{hasFilters ? ` · ${tags.length + (maxTotalTime != null ? 1 : 0)}` : ""}
          </button>
        </div>

        {/* active filter summary */}
        {hasFilters && (
          <div className="r-chips" style={{ marginTop: 12, alignItems: "center" }}>
            {tags.map((t) => (
              <TagPill key={`${t.type}:${t.name}`} tag={t} onRemove={() => toggleTag(t.type, t.name)} />
            ))}
            {maxTotalTime != null && (
              <span className="r-tag dish">
                ≤ {maxTotalTime} min
                <button onClick={() => setMaxTotalTime(null)} aria-label="Clear time filter"
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}>✕</button>
              </span>
            )}
            <button className="r-btn r-btn-quiet" onClick={clearAll} style={{ padding: "4px 8px" }}>
              <X size={13} /> Clear
            </button>
          </div>
        )}

        {/* expandable filter bar */}
        {showFilters && (
          <div className="r-filterbar r-fadein">
            <div className="r-filter-group">
              <span className="r-type-label">Max time</span>
              {TIME_CAPS.map((c) => (
                <button
                  key={c}
                  className={`r-chip${maxTotalTime === c ? " active accent" : ""}`}
                  onClick={() => setMaxTotalTime(maxTotalTime === c ? null : c)}
                >
                  ≤ {c} min
                </button>
              ))}
            </div>
            {activeTypes.map((type) => (
              <div key={type} className="r-filter-group">
                <span className="r-type-label">{TAG_TYPE_LABEL[type]}</span>
                {available[type].map((name) => {
                  const on = tags.some((t) => sameTag(t, { type, name }));
                  return (
                    <button key={name} className={`r-chip${on ? " active" : ""}`} onClick={() => toggleTag(type, name)}>
                      {name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* result count */}
        <p className="r-eyebrow" style={{ margin: "20px 0 12px" }}>
          {shown.length} {shown.length === 1 ? "recipe" : "recipes"}
          {recipes.length !== shown.length ? ` of ${recipes.length}` : ""}
        </p>

        {/* grid */}
        {shown.length === 0 ? (
          <div className="r-empty">
            <div className="r-emoji">{recipes.length === 0 ? "🍳" : "🔍"}</div>
            {recipes.length === 0 ? (
              <>
                <p style={{ fontSize: 17, marginBottom: 4 }}>Your recipe box is empty.</p>
                <p style={{ fontSize: 14, marginBottom: 18 }}>Add your first recipe to get cooking.</p>
                <button className="r-btn r-btn-accent" onClick={onNew}><Plus size={16} /> Add a recipe</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 16, marginBottom: 4 }}>No recipes match those filters.</p>
                <button className="r-btn r-btn-quiet" onClick={clearAll}>Clear filters</button>
              </>
            )}
          </div>
        ) : (
          <div className="r-grid">
            {shown.map((r) => {
              const tt = totalTime(r);
              return (
                <button key={r.id} className="r-card" onClick={() => onOpen(r.id)}>
                  <h3>{r.title || "Untitled recipe"}</h3>
                  {r.description && <p className="r-card-desc">{r.description}</p>}
                  <div className="r-chips" style={{ gap: 6 }}>
                    {r.tags.slice(0, 4).map((t) => (
                      <TagPill key={`${t.type}:${t.name}`} tag={t} />
                    ))}
                    {r.tags.length > 4 && <span className="r-tag">+{r.tags.length - 4}</span>}
                  </div>
                  <div className="r-card-meta">
                    {tt != null && <span><Clock size={12} style={{ verticalAlign: "-2px" }} /> {formatMinutes(tt)}</span>}
                    <span><Users size={12} style={{ verticalAlign: "-2px" }} /> {r.servings}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
