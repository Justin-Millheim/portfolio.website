"use client";

interface Entry { coord: string; name: string; profession: string; text: string; }

// All currently-revealed clues in one scrollable, centered sheet. Lets players
// reason over every clue without the board itself ever changing size.
export default function ClueList({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-cluelist" onClick={(e) => e.stopPropagation()}>
        <button className="cl-sheet-x" onClick={onClose} aria-label="close">✕</button>
        <div className="cl-win-mark">Revealed clues · {entries.length}</div>
        {entries.length === 0 ? (
          <p className="cl-cluelist-empty">No clues yet. Identify a suspect to reveal their clue.</p>
        ) : (
          <ul className="cl-cluelist-items">
            {entries.map((e) => (
              <li key={e.coord} className="cl-cluelist-item">
                <span className="cl-cluelist-who cl-mono">{e.coord} · {e.name}</span>
                <span className="cl-cluelist-text">{e.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
