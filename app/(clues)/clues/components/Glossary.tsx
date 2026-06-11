"use client";

import { useState } from "react";

const TERMS: [string, string][] = [
  ["Goal", "Label all 20 suspects innocent or criminal. Everyone tells the truth — even criminals."],
  ["No guessing", "You can only judge a suspect once the revealed clues force their verdict with certainty. A judgement that isn't yet provable is rejected."],
  ["Neighbours", "The up-to-8 suspects touching a card, including diagonals."],
  ["Row / Column", "Rows run across (1–5); columns run down (A–D). “Row 3” is A3, B3, C3, D3."],
  ["Corners", "The four corner cards: A1, D1, A5, D5."],
  ["The edge", "The 14 cards around the outside of the board (corners included)."],
  ["Connected", "The criminals in a row/column sit in one unbroken run — no innocent between two criminals."],
  ["Even / odd", "Even = 0, 2, 4… ; odd = 1, 3, 5…"],
  ["More … than …", "A strict comparison: the first group has strictly more criminals (it does not require the second group to have any)."],
  ["If A then B", "Does NOT mean “if not A then not B”. It DOES mean “if not B then not A”."],
  ["Colour tags", "Tap a card's corner dot to cycle a colour for tracking hunches. “Clear” wipes a card's tag and dims it."],
];

export default function Glossary() {
  const [open, setOpen] = useState(false);
  return (
    <div className="cl-glossary">
      <button className="cl-glossary-toggle" onClick={() => setOpen((v) => !v)}>
        Rules &amp; terms {open ? "▲" : "▾"}
      </button>
      {open && (
        <dl className="cl-glossary-list">
          {TERMS.map(([term, def]) => (
            <div key={term} className="cl-glossary-row">
              <dt>{term}</dt>
              <dd>{def}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
