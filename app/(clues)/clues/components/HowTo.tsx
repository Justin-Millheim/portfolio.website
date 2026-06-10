"use client";

export default function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-howto" onClick={(e) => e.stopPropagation()}>
        <div className="cl-win-mark">How to play</div>
        <h2 className="cl-win-title">Read the clues. Never guess.</h2>
        <ul className="cl-howto-list">
          <li><b>Twenty suspects.</b> Each is either innocent or a criminal. One is revealed for free to get you started.</li>
          <li><b>Clues unlock as you go.</b> Tap a suspect and label them. Their clue then appears for everyone to use.</li>
          <li><b>Pure deduction.</b> Every clue is true, and the board is always solvable without a single guess.</li>
          <li><b>The logic that bites:</b> &ldquo;if A then B&rdquo; does <i>not</i> mean &ldquo;if not A then not B&rdquo;. It <i>does</i> mean &ldquo;if not B then not A&rdquo;.</li>
          <li><b>Stuck?</b> The hint button first points you at the clue to read, then at the suspect you can pin down.</li>
          <li><b>Tag a corner</b> of any card to colour-code a hunch while you test it.</li>
        </ul>
        <button className="cl-btn cl-btn-primary" onClick={onClose}>Start deducing</button>
      </div>
    </div>
  );
}
