"use client";

import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Clock, Users, ChefHat, Star, ExternalLink } from "lucide-react";
import type { Recipe } from "@/lib/recipes/types";
import { scaleFactor, scaledQuantity } from "@/lib/recipes/scale";
import { totalTime, formatMinutes } from "@/lib/recipes/format";
import TagPill from "./TagPill";

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function RecipeDetail({
  recipe,
  onBack,
  onEdit,
  onDelete,
}: {
  recipe: Recipe;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [servings, setServings] = useState(recipe.servings || 1);
  const factor = scaleFactor(recipe, servings);
  const scaled = servings !== recipe.servings;
  const tt = totalTime(recipe);

  return (
    <div className="r-wrap r-narrow r-fadein" style={{ paddingTop: 18 }}>
      <div className="r-accent-tr" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <button className="r-btn r-btn-quiet" onClick={onBack} style={{ paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="r-icon-btn" onClick={onEdit} aria-label="Edit recipe"><Pencil size={16} /></button>
          <button className="r-icon-btn" onClick={onDelete} aria-label="Delete recipe"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="r-hero">
        <h1>{recipe.title || "Untitled recipe"}</h1>
        {recipe.description && <p className="r-detail-desc">{recipe.description}</p>}
        {recipe.tags.length > 0 && (
          <div className="r-chips" style={{ marginTop: 14 }}>
            {recipe.tags.map((t) => <TagPill key={`${t.type}:${t.name}`} tag={t} />)}
          </div>
        )}
      </div>

      <div className="r-meta-row">
        {recipe.prepTime ? (
          <div className="r-meta"><b>{formatMinutes(recipe.prepTime)}</b><span>Prep</span></div>
        ) : null}
        {recipe.cookTime ? (
          <div className="r-meta"><b>{formatMinutes(recipe.cookTime)}</b><span>Cook</span></div>
        ) : null}
        {tt != null && (
          <div className="r-meta"><b><Clock size={14} style={{ verticalAlign: "-2px" }} /> {formatMinutes(tt)}</b><span>Total</span></div>
        )}
        {recipe.difficulty && (
          <div className="r-meta"><b><ChefHat size={14} style={{ verticalAlign: "-2px" }} /> {DIFFICULTY_LABEL[recipe.difficulty]}</b><span>Difficulty</span></div>
        )}
        {recipe.rating ? (
          <div className="r-meta"><b><Star size={14} style={{ verticalAlign: "-2px" }} fill="currentColor" /> {recipe.rating}/5</b><span>Rating</span></div>
        ) : null}
      </div>

      {/* serving scaler — the live recompute */}
      <div className="r-scaler">
        <div className="r-step">
          <Users size={18} style={{ color: "var(--r-muted)" }} />
          <button className="r-stepbtn" onClick={() => setServings((s) => Math.max(1, s - 1))} disabled={servings <= 1} aria-label="Fewer servings">−</button>
          <span className="r-servings-num">{servings}</span>
          <button className="r-stepbtn" onClick={() => setServings((s) => Math.min(99, s + 1))} disabled={servings >= 99} aria-label="More servings">+</button>
          <span style={{ fontSize: 13, color: "var(--r-muted)" }}>servings</span>
        </div>
        {scaled && <span className="r-scaled-note">scaled {factor >= 1 ? "↑" : "↓"} from {recipe.servings}</span>}
        {scaled && (
          <button className="r-reset" onClick={() => setServings(recipe.servings)}>reset</button>
        )}
      </div>

      <h2 className="r-section-title">Ingredients</h2>
      {recipe.ingredients.length === 0 ? (
        <p style={{ color: "var(--r-faint)", fontSize: 14 }}>No ingredients listed.</p>
      ) : (
        <ul className="r-ing-list">
          {recipe.ingredients.map((ing) => {
            const qty = scaledQuantity(ing, factor);
            const lead = [qty, ing.unit.trim()].filter(Boolean).join(" ");
            return (
              <li key={ing.id}>
                <span className="r-qty">{lead || "—"}</span>
                <span>
                  {ing.item}
                  {ing.prep && <span className="r-prep">, {ing.prep}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {recipe.instructions.length > 0 && (
        <>
          <h2 className="r-section-title">Instructions</h2>
          <ol className="r-steps">
            {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </>
      )}

      {recipe.notes && (
        <>
          <h2 className="r-section-title">Notes</h2>
          <p style={{ fontSize: 15, color: "var(--r-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{recipe.notes}</p>
        </>
      )}

      {recipe.sourceUrl && (
        <p style={{ marginTop: 24 }}>
          <a className="r-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={13} style={{ verticalAlign: "-2px" }} /> Source
          </a>
        </p>
      )}
    </div>
  );
}
