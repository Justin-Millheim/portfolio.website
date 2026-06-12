"use client";

import { useMemo, useState } from "react";
import type { Mode, Song } from "@/lib/sally/types";
import { MODE_LABELS } from "@/lib/sally/types";
import { phaseLabel } from "@/lib/sally/format";
import SallyMark from "./SallyMark";

// Library / Home (PRD §14.2): the entry point and browsable corpus — past
// songs with mode filters, resume-in-progress cards showing current phase,
// and the "New song" door into the writing room.

const MODE_FILTERS: (Mode | "all")[] = ["all", "gift", "anthemic", "confessional_rap", "double_entendre"];

export default function Library({
  songs,
  account,
  onOpen,
  onNew,
  onArchive,
  onDelete,
  onSignIn,
  onSignOut,
}: {
  songs: Song[];
  account: { mode: "guest" | "cloud"; email?: string } | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onArchive: (song: Song) => void;
  onDelete: (song: Song) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [filter, setFilter] = useState<Mode | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      songs.filter(
        (s) =>
          (showArchived ? s.status === "archived" : s.status !== "archived") &&
          (filter === "all" || s.mode === filter),
      ),
    [songs, filter, showArchived],
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="sb-wrap sb-fadein">
      <header className="sb-lib-head">
        <div className="sb-lib-brand">
          <SallyMark size={44} expression="idle" />
          <div>
            <h1 className="sb-serif">Sally <b>the Songbird</b></h1>
            <p className="sb-mono sb-lib-tag">the writing room is open</p>
          </div>
        </div>
        <div className="sb-lib-account">
          {account?.mode === "cloud" ? (
            <>
              <span className="sb-mono sb-account-chip" title={account.email}>{account.email}</span>
              <button className="sb-btn sb-btn-quiet" onClick={onSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <span className="sb-mono sb-account-chip">guest — on-device only</span>
              <button className="sb-btn sb-btn-quiet" onClick={onSignIn}>Sign in</button>
            </>
          )}
        </div>
      </header>

      <div className="sb-lib-bar">
        <div className="sb-lib-filters">
          {MODE_FILTERS.map((m) => (
            <button
              key={m}
              className={`sb-chip ${filter === m ? "on" : ""}`}
              onClick={() => setFilter(m)}
            >
              {m === "all" ? "all songs" : MODE_LABELS[m].name.toLowerCase()}
            </button>
          ))}
          <button className={`sb-chip quiet ${showArchived ? "on" : ""}`} onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "← back to the shelf" : "archived"}
          </button>
        </div>
        <button className="sb-btn sb-btn-primary" onClick={onNew}>+ New song</button>
      </div>

      {visible.length === 0 ? (
        <div className="sb-empty">
          <div className="sb-bob"><SallyMark size={110} expression="delighted" /></div>
          <h2 className="sb-serif">{showArchived ? "Nothing on the archive shelf." : "The shelf is bare and Sally is restless."}</h2>
          {!showArchived && (
            <>
              <p>Bring her a moment, a person, a feeling — she&apos;ll bring the bars.</p>
              <button className="sb-btn sb-btn-primary sb-big" onClick={onNew}>Start your first song →</button>
            </>
          )}
        </div>
      ) : (
        <div className="sb-song-grid">
          {visible.map((s) => (
            <div key={s.id} className="sb-song-card" onClick={() => onOpen(s.id)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onOpen(s.id)}>
              <div className="sb-song-top">
                <span className="sb-mono sb-song-mode">{s.mode ? MODE_LABELS[s.mode].name : "no mode yet"}</span>
                <button
                  className="sb-song-menu-btn"
                  onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === s.id ? null : s.id); }}
                  aria-label="Song menu"
                >
                  ⋯
                </button>
                {menuFor === s.id && (
                  <div className="sb-song-menu" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setMenuFor(null); onArchive(s); }}>
                      {s.status === "archived" ? "Unarchive" : "Archive"}
                    </button>
                    <button className="danger" onClick={() => { setMenuFor(null); onDelete(s); }}>Delete</button>
                  </div>
                )}
              </div>
              <h3 className="sb-serif">{s.title}</h3>
              <div className="sb-song-foot">
                {s.status === "complete" ? (
                  <span className="sb-song-phase done">Suno-ready ✓</span>
                ) : (
                  <span className="sb-song-phase">Resume — {phaseLabel(s.currentPhase)}</span>
                )}
                <span className="sb-mono sb-song-date">{fmtDate(s.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="sb-lib-foot sb-mono">
        five phases · gates are sacred · nothing is ever lost
      </footer>
    </div>
  );
}
