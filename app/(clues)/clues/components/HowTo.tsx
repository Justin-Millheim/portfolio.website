"use client";

export default function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-howto" onClick={(e) => e.stopPropagation()}>
        <div className="cl-win-mark">How to play</div>
        <h2 className="cl-win-title">Read the clues. Never guess.</h2>
        <ul className="cl-howto-list">
          <li><b>Twenty suspects</b>, each innocent or a criminal. One is revealed for free to start you off.</li>
          <li><b>Clues unlock as you go.</b> Correctly label a suspect and their clue appears for everyone to use.</li>
          <li><b>Everyone tells the truth</b>, even the criminals. A profession never implies guilt unless a clue says so.</li>
          <li><b>Neighbours include diagonals</b> (up to 8). Corners are the 4 corners; the edge is the 14 around the rim.</li>
          <li><b>Pure deduction.</b> Every board is solvable with no guessing, and the clues pin exactly one answer.</li>
          <li><b>The logic that bites:</b> &ldquo;if A then B&rdquo; does <i>not</i> mean &ldquo;if not A then not B&rdquo;. It <i>does</i> mean &ldquo;if not B then not A&rdquo;.</li>
          <li><b>Stuck?</b> The hint button first points at the clue to read, then at the suspect you can pin down. Tap a card corner to colour-tag a hunch.</li>
        </ul>
        <p className="cl-howto-foot">Practice puzzles run Easy → Tricky. The daily case ramps through the week.</p>
        <button className="cl-btn cl-btn-primary" onClick={onClose}>Start deducing</button>
      </div>
    </div>
  );
}
