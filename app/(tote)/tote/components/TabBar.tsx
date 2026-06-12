"use client";

import { ShoppingCart, BookOpen, CalendarDays } from "lucide-react";

export type Tab = "lists" | "recipes" | "plan";

const TABS: { id: Tab; label: string; Icon: typeof ShoppingCart }[] = [
  { id: "lists", label: "Lists", Icon: ShoppingCart },
  { id: "recipes", label: "Recipes", Icon: BookOpen },
  { id: "plan", label: "Plan", Icon: CalendarDays },
];

export default function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="t-tabbar">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={`t-tab${active === id ? " active" : ""}`} onClick={() => onChange(id)} aria-current={active === id}>
          <span className="t-tab-ico"><Icon size={19} /></span>
          {label}
        </button>
      ))}
    </nav>
  );
}
