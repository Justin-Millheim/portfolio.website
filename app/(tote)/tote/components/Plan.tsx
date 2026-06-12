"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import type { GroceryList, MealPlanEntry, MealSlot, ToteRecipe } from "@/lib/tote/types";
import {
  MEAL_SLOTS, SLOT_LABEL, weekDates, dayLabel, isToday, weekRangeLabel, aggregateForPlan,
} from "@/lib/tote/plan";
import { newId, emptyList } from "@/lib/tote/seed";
import { useConfirm } from "./ConfirmProvider";
import TopBar from "./TopBar";

export default function Plan({
  plan, recipes, userId, onSaveEntry, onRemoveEntry, onSaveList,
}: {
  plan: MealPlanEntry[];
  recipes: ToteRecipe[];
  userId: string;
  onSaveEntry: (e: MealPlanEntry) => void;
  onRemoveEntry: (id: string) => void;
  onSaveList: (l: GroceryList) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [picking, setPicking] = useState<{ date: string; slot: MealSlot } | null>(null);
  const { toast } = useConfirm();

  const dates = weekDates(new Date(), weekOffset);
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  function entryFor(date: string, slot: MealSlot): MealPlanEntry | undefined {
    return plan.find((e) => e.date === date && e.slot === slot);
  }

  function assign(date: string, slot: MealSlot, recipeId: string) {
    const existing = entryFor(date, slot);
    const entry: MealPlanEntry = {
      id: existing?.id ?? newId("mp"), userId, date, slot, recipeId,
    };
    onSaveEntry(entry);
  }
  function clearSlot(date: string, slot: MealSlot) {
    const existing = entryFor(date, slot);
    if (existing) onRemoveEntry(existing.id);
  }

  // The payoff: consolidate every planned recipe this week into one new list.
  function generateList() {
    const planned: { recipe: ToteRecipe; servings: number }[] = [];
    for (const date of dates) {
      for (const slot of MEAL_SLOTS) {
        const e = entryFor(date, slot);
        if (e?.recipeId) {
          const r = recipeById.get(e.recipeId);
          if (r) planned.push({ recipe: r, servings: e.servings ?? r.servings });
        }
      }
    }
    if (planned.length === 0) { toast("Plan some recipes first."); return; }
    const items = aggregateForPlan(planned);
    const list = emptyList(userId, `Week of ${weekRangeLabel(dates)}`);
    onSaveList({ ...list, items });
    toast(`Built a list of ${items.length} items from ${planned.length} meals`);
  }

  return (
    <>
      <TopBar
        left={<div><h1>Meal Plan</h1><div className="t-sub">{weekRangeLabel(dates)}</div></div>}
        right={<button className="t-btn t-btn-accent" onClick={generateList}><ShoppingCart size={15} /> List</button>}
      />
      <div className="t-app t-scroll t-fadein">
        <div className="t-week-nav">
          <button className="t-iconbtn" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft size={18} /></button>
          <button className="t-btn t-btn-ghost" onClick={() => setWeekOffset(0)} style={{ padding: "8px 14px" }}>
            {weekOffset === 0 ? "This week" : weekRangeLabel(dates)}
          </button>
          <button className="t-iconbtn" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight size={18} /></button>
        </div>

        {dates.map((date) => {
          const { dow, date: dlabel } = dayLabel(date);
          const today = isToday(date);
          return (
            <div key={date} className={`t-day${today ? " today" : ""}`}>
              <div className="t-day-head">
                <span className="t-dow">{dow}</span>
                <span className="t-date">{dlabel}</span>
                {today && <span className="t-today-badge">Today</span>}
              </div>
              {MEAL_SLOTS.map((slot) => {
                const e = entryFor(date, slot);
                const r = e?.recipeId ? recipeById.get(e.recipeId) : undefined;
                const label = r?.name ?? e?.text;
                return (
                  <div key={slot} className="t-slot">
                    <span className="t-slot-label">{SLOT_LABEL[slot]}</span>
                    <button className={`t-slot-tap${label ? "" : " empty"}`} onClick={() => setPicking({ date, slot })}>
                      {label ?? "+ Add"}
                    </button>
                    {label && (
                      <button className="t-item-x" aria-label="Clear" onClick={() => clearSlot(date, slot)}><X size={15} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {picking && (
        <RecipePicker
          recipes={recipes}
          slotLabel={`${dayLabel(picking.date).dow} ${SLOT_LABEL[picking.slot]}`}
          onPick={(id) => { assign(picking.date, picking.slot, id); setPicking(null); }}
          onClear={() => { clearSlot(picking.date, picking.slot); setPicking(null); }}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}

function RecipePicker({
  recipes, slotLabel, onPick, onClear, onClose,
}: {
  recipes: ToteRecipe[];
  slotLabel: string;
  onPick: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="t-sheet-backdrop" onClick={onClose}>
      <div className="t-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{slotLabel}</h3>
        {recipes.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14, padding: "8px 12px" }}>No recipes yet — add some in the Recipes tab.</p>
        ) : (
          recipes.map((r) => (
            <button key={r.id} className="t-sheet-item" onClick={() => onPick(r.id)}>
              <span style={{ fontSize: 18 }}>🍽️</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{r.name}</span>
              <span className="t-pill">{r.servings} serv</span>
            </button>
          ))
        )}
        <button className="t-sheet-item" onClick={onClear} style={{ color: "var(--coral-dk)", fontWeight: 700 }}>
          <span style={{ width: 24, textAlign: "center" }}>✕</span> Clear this meal
        </button>
      </div>
    </div>,
    document.body
  );
}
