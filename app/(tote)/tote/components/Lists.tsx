"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ShoppingCart, Plus, MoreVertical, Check } from "lucide-react";
import type { GroceryList, GroceryItem, Category, ListSort } from "@/lib/tote/types";
import { categoryMeta, CATEGORY_ORDER } from "@/lib/tote/categories";
import { categorize } from "@/lib/tote/catalog";
import { newItem, emptyList } from "@/lib/tote/seed";
import { useConfirm } from "./ConfirmProvider";
import TopBar from "./TopBar";
import QuickAdd from "./QuickAdd";
import CategorySheet from "./CategorySheet";

type Account = { mode: "guest" | "cloud"; email?: string };

export default function Lists({
  lists,
  userId,
  account,
  onSave,
  onRemove,
  onSignIn,
  onSignOut,
}: {
  lists: GroceryList[];
  userId: string;
  account: Account | null;
  onSave: (list: GroceryList) => void;
  onRemove: (id: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(lists.length === 1 ? lists[0].id : null);
  const [catItem, setCatItem] = useState<GroceryItem | null>(null);
  const { confirm, toast } = useConfirm();

  const open = lists.find((l) => l.id === openId) ?? null;

  // Recent item names across all lists, newest first — feeds autocomplete.
  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const all = lists.flatMap((l) => l.items).sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
    for (const it of all) {
      const k = it.name.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(it.name); }
    }
    return out;
  }, [lists]);

  function touch(list: GroceryList, items: GroceryItem[]): GroceryList {
    return { ...list, items, updatedAt: new Date().toISOString() };
  }

  // ---- list picker ----
  async function createList() {
    const name = (await promptName("New list", "List name", "Groceries", confirm)) ?? null;
    if (name === null) return;
    const list = emptyList(userId, name || "Untitled list");
    onSave(list);
    setOpenId(list.id);
  }

  if (!open) {
    return (
      <>
        <TopBar
          left={<div><h1>Lists</h1><div className="t-sub">{lists.length} {lists.length === 1 ? "list" : "lists"}</div></div>}
          right={
            <>
              {account?.mode === "cloud"
                ? <button className="t-btn t-btn-quiet" onClick={onSignOut} title={account.email}>Sign out</button>
                : <button className="t-btn t-btn-quiet" onClick={onSignIn}>Sign in</button>}
              <button className="t-fab" aria-label="New list" onClick={createList}><Plus size={20} /></button>
            </>
          }
        />
        <div className="t-app t-scroll t-fadein">
          {lists.length === 0 ? (
            <div className="t-empty">
              <div className="t-emoji">🛒</div>
              <p style={{ fontSize: 17, marginBottom: 4 }}>No lists yet.</p>
              <p style={{ fontSize: 14, marginBottom: 18 }}>Create your first shopping list.</p>
              <button className="t-btn t-btn-primary" onClick={createList}><Plus size={16} /> New list</button>
            </div>
          ) : (
            lists.map((l) => {
              const left = l.items.filter((i) => !i.checked).length;
              return (
                <div key={l.id} className="t-listrow" onClick={() => setOpenId(l.id)}>
                  <div className="t-listrow-ico"><ShoppingCart size={20} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{l.name}</h3>
                    <div className="t-listrow-meta">
                      {l.items.length === 0 ? "Empty" : `${left} to buy · ${l.items.length} total`}
                    </div>
                  </div>
                  <ChevronLeft size={18} style={{ transform: "rotate(180deg)", color: "var(--faint)" }} />
                </div>
              );
            })
          )}
        </div>
      </>
    );
  }

  // ---- open list detail ----
  function addItem(name: string, quantity: string) {
    if (!open) return;
    onSave(touch(open, [...open.items, newItem(name, quantity)]));
  }
  function toggleItem(item: GroceryItem) {
    if (!open) return;
    onSave(touch(open, open.items.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i))));
  }
  function removeItem(id: string) {
    if (!open) return;
    onSave(touch(open, open.items.filter((i) => i.id !== id)));
  }
  function setItemCategory(id: string, category: Category) {
    if (!open) return;
    onSave(touch(open, open.items.map((i) => (i.id === id ? { ...i, category } : i))));
  }
  function setSort(sort: ListSort) { if (open) onSave({ ...open, sort }); }
  async function clearChecked() {
    if (!open) return;
    const n = open.items.filter((i) => i.checked).length;
    if (!n) { toast("Nothing checked off yet."); return; }
    const r = await confirm({ title: `Clear ${n} checked ${n === 1 ? "item" : "items"}?`, confirmLabel: "Clear", cancelLabel: "Cancel", danger: true });
    if (r === "confirm") onSave(touch(open, open.items.filter((i) => !i.checked)));
  }
  async function listMenu() {
    if (!open) return;
    const r = await confirm({
      title: open.name,
      message: "Manage this list.",
      confirmLabel: "Rename list",
      altLabel: "Delete list",
      cancelLabel: "Close",
    });
    if (r === "confirm") {
      const name = await promptName("Rename list", "List name", open.name, confirm);
      if (name) onSave({ ...open, name });
    } else if (r === "alt") {
      const d = await confirm({ title: `Delete “${open.name}”?`, message: "This permanently removes the list and its items.", confirmLabel: "Delete", cancelLabel: "Cancel", danger: true });
      if (d === "confirm") { onRemove(open.id); setOpenId(null); }
    }
  }

  const unchecked = open.items.filter((i) => !i.checked);
  const checked = open.items.filter((i) => i.checked);
  const grouped = groupItems(unchecked, open.sort);

  return (
    <>
      <TopBar
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <button className="t-iconbtn" aria-label="Back to lists" onClick={() => setOpenId(null)} style={{ width: 34, height: 34 }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 20, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{open.name}</h1>
              <div className="t-sub">{unchecked.length} to buy{checked.length ? ` · ${checked.length} done` : ""}</div>
            </div>
          </div>
        }
        right={<button className="t-iconbtn" aria-label="List menu" onClick={listMenu}><MoreVertical size={18} /></button>}
      />

      <div className="t-app">
        <QuickAdd recents={recents} onAdd={addItem} />

        {/* sort toggle */}
        <div className="t-chips" style={{ marginBottom: 4 }}>
          {(["aisle", "alpha", "added"] as ListSort[]).map((s) => (
            <button key={s} className={`t-chip${open.sort === s ? " active" : ""}`} onClick={() => setSort(s)}>
              {s === "aisle" ? "By aisle" : s === "alpha" ? "A–Z" : "Recent"}
            </button>
          ))}
        </div>

        {open.items.length === 0 ? (
          <div className="t-empty"><div className="t-emoji">📝</div><p>Add your first item above.</p></div>
        ) : (
          <>
            {grouped.map(({ category, items }) => {
              const meta = categoryMeta(category);
              return (
                <section key={category}>
                  {open.sort === "aisle" && (
                    <div className="t-aisle-head">
                      <span className="t-aisle-dot" style={{ background: meta.color }} />
                      <span>{meta.emoji} {meta.label}</span>
                      <span className="t-aisle-count">{items.length}</span>
                    </div>
                  )}
                  {items.map((it) => (
                    <ItemRow key={it.id} item={it} onToggle={() => toggleItem(it)} onRemove={() => removeItem(it.id)}
                      onPickCategory={() => setCatItem(it)} />
                  ))}
                </section>
              );
            })}

            {checked.length > 0 && (
              <>
                <div className="t-aisle-head" style={{ marginTop: 26 }}>
                  <Check size={13} /> <span>Checked off</span>
                  <button className="t-link" style={{ marginLeft: "auto", fontSize: 12 }} onClick={clearChecked}>Clear</button>
                </div>
                {checked.map((it) => (
                  <ItemRow key={it.id} item={it} onToggle={() => toggleItem(it)} onRemove={() => removeItem(it.id)}
                    onPickCategory={() => setCatItem(it)} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {catItem && (
        <CategorySheet
          title={catItem.name}
          current={catItem.category}
          onPick={(c) => setItemCategory(catItem.id, c)}
          onClose={() => setCatItem(null)}
        />
      )}
    </>
  );
}

function ItemRow({
  item, onToggle, onRemove, onPickCategory,
}: {
  item: GroceryItem;
  onToggle: () => void;
  onRemove: () => void;
  onPickCategory: () => void;
}) {
  return (
    <div className={`t-item${item.checked ? " done" : ""}`} onClick={onToggle}>
      <span className={`t-check${item.checked ? " on" : ""}`}>{item.checked && <Check size={15} />}</span>
      <div className="t-item-body">
        <div className="t-item-name">{item.name}</div>
        {item.quantity && <div className="t-item-qty">{item.quantity}</div>}
      </div>
      <button className="t-item-x" aria-label="Change aisle" title="Change aisle"
        onClick={(e) => { e.stopPropagation(); onPickCategory(); }} style={{ fontSize: 15 }}>
        {categoryMeta(item.category).emoji}
      </button>
      <button className="t-item-x" aria-label="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
    </div>
  );
}

// Group + order items for display per the chosen sort.
function groupItems(items: GroceryItem[], sort: ListSort): { category: Category; items: GroceryItem[] }[] {
  if (sort === "alpha") {
    return [{ category: "other", items: [...items].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())) }];
  }
  if (sort === "added") {
    return [{ category: "other", items: [...items].sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1)) }];
  }
  // aisle
  const byCat = new Map<Category, GroceryItem[]>();
  for (const it of items) {
    const arr = byCat.get(it.category) ?? [];
    arr.push(it);
    byCat.set(it.category, arr);
  }
  return Array.from(byCat.entries())
    .sort((a, b) => CATEGORY_ORDER[a[0]] - CATEGORY_ORDER[b[0]])
    .map(([category, list]) => ({ category, items: list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())) }));
}

// Tiny prompt helper built on the confirm dialog isn't possible (no text input),
// so we fall back to window.prompt — fine for the rare rename/new-list action.
async function promptName(
  _title: string, _label: string, initial: string,
  _confirm: ReturnType<typeof useConfirm>["confirm"],
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const v = window.prompt(_title, initial);
  return v == null ? null : v.trim();
}
