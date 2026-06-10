"use client";

interface Props {
  timeLabel: string;
  hintsUsed: number;
  errors: number;
  onNew: () => void;
  onClose: () => void;
}

export default function WinOverlay({ timeLabel, hintsUsed, errors, onNew, onClose }: Props) {
  const clean = errors === 0 && hintsUsed === 0;
  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-win" onClick={(e) => e.stopPropagation()}>
        <div className="cl-win-mark">Case closed</div>
        <h2 className="cl-win-title">All 20 suspects identified.</h2>
        <p className="cl-win-sub">
          {clean
            ? "Solved on pure logic. No hints, no missteps."
            : "Every verdict is in and every verdict is right."}
        </p>
        <div className="cl-win-stats">
          <div><span>{timeLabel}</span><label>time</label></div>
          <div><span>{hintsUsed}</span><label>hints</label></div>
          <div><span>{errors}</span><label>missteps</label></div>
        </div>
        <button className="cl-btn cl-btn-primary" onClick={onNew}>New case</button>
        <button className="cl-btn cl-btn-ghost" onClick={onClose}>Review the board</button>
      </div>
    </div>
  );
}
