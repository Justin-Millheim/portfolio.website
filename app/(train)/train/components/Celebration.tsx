"use client";

import { useEffect, useState } from "react";

// Goofy critters that streak across the screen with a party accessory.
const CRITTERS = ["🦄", "🐘", "🦭", "🐧", "🦩", "🦔", "🐢", "🦫", "🦦", "🦙", "🦛", "🦨", "🐅", "🦥"];
const HATS = ["🎉", "🕶️", "🎩", "👑", "🥳", "🎈"];
const EXERCISE_MSGS = ["Good job!", "Keep it up!", "Nice work!", "Crushing it!", "Beast mode!", "On fire! 🔥", "You've got this!", "Boom! 💥", "Strong!"];
const FINALE_MSGS = ["You killed it!", "Good work!", "Workout complete! 💪", "Absolute legend!", "That's a wrap! 🎉"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// `id` is a monotonically increasing trigger; when it changes (and is > 0) the
// celebration plays once and auto-dismisses. Purely visual; pointer-events none.
export default function Celebration({ id, variant }: { id: number; variant: "exercise" | "finale" }) {
  const [shown, setShown] = useState<{ key: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    setShown({ key: id });
    // Keep these in sync with the animation durations in train.css. The
    // exercise cheer now slides in, holds long enough to actually read the
    // message, then drifts off; the finale parade is a slow victory lap.
    const t = setTimeout(() => setShown(null), variant === "finale" ? 5600 : 4200);
    return () => clearTimeout(t);
  }, [id, variant]);

  if (!shown) return null;

  if (variant === "exercise") {
    const top = 30 + Math.random() * 35; // vary vertical position
    return (
      <div className="t-cheer" aria-hidden>
        <div className="t-critter t-streak" style={{ top: `${top}%`, left: 0 }}>
          <span className="emoji">
            {pick(CRITTERS)}
            <span className="hat">{pick(HATS)}</span>
          </span>
          <span className="t-bubble">{pick(EXERCISE_MSGS)}</span>
        </div>
      </div>
    );
  }

  // finale: a parade of critters + a centered banner + confetti
  const parade = Array.from({ length: 7 }, (_, i) => i);
  const confetti = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className="t-cheer" aria-hidden>
      {confetti.map((i) => (
        <span key={`c${i}`} className="t-confetti" style={{ left: `${(i / 14) * 100}%`, animationDelay: `${Math.random() * 0.6}s` }}>
          {pick(HATS)}
        </span>
      ))}
      {parade.map((i) => (
        <div
          key={i}
          className="t-critter t-streak-fast"
          style={{ top: `${20 + i * 9}%`, left: 0, animationDelay: `${i * 0.12}s` }}
        >
          <span className="emoji">
            {pick(CRITTERS)}
            <span className="hat">{pick(HATS)}</span>
          </span>
        </div>
      ))}
      <div className="t-finale-banner">
        <div style={{ fontSize: 40 }}>🎉</div>
        <div className="big">{pick(FINALE_MSGS)}</div>
      </div>
    </div>
  );
}
