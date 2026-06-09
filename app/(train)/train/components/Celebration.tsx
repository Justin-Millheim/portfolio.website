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

// Everything random about a celebration is decided ONCE, when it triggers, and
// frozen in state. The parent (Runner) re-renders every second as its clock
// ticks; if we rolled Math.random() in the render body the critter would
// teleport to a new vertical position — and swap emoji/message — mid-animation.
interface ParadeMember { critter: string; hat: string; top: number; delay: number }
interface Confetto { hat: string; left: number; delay: number }
interface Shown {
  key: number;
  top: number;
  critter: string;
  hat: string;
  msg: string;
  finaleMsg: string;
  parade: ParadeMember[];
  confetti: Confetto[];
}

// `id` is a monotonically increasing trigger; when it changes (and is > 0) the
// celebration plays once and auto-dismisses. Purely visual; pointer-events none.
export default function Celebration({ id, variant }: { id: number; variant: "exercise" | "finale" }) {
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (!id) return;
    // Freeze all positions/emoji/messages now so re-renders can't disturb them.
    setShown({
      key: id,
      top: 30 + Math.random() * 35, // vary vertical position, once
      critter: pick(CRITTERS),
      hat: pick(HATS),
      msg: pick(EXERCISE_MSGS),
      finaleMsg: pick(FINALE_MSGS),
      parade: Array.from({ length: 7 }, (_, i) => ({
        critter: pick(CRITTERS), hat: pick(HATS), top: 20 + i * 9, delay: i * 0.12,
      })),
      confetti: Array.from({ length: 14 }, (_, i) => ({
        hat: pick(HATS), left: (i / 14) * 100, delay: Math.random() * 0.6,
      })),
    });
    // Keep these in sync with the animation durations in train.css. The
    // exercise cheer slides in, holds long enough to actually read the
    // message, then drifts off; the finale parade is a slow victory lap.
    const t = setTimeout(() => setShown(null), variant === "finale" ? 5600 : 4200);
    return () => clearTimeout(t);
  }, [id, variant]);

  if (!shown) return null;

  if (variant === "exercise") {
    return (
      <div className="t-cheer" aria-hidden>
        <div className="t-critter t-streak" style={{ top: `${shown.top}%`, left: 0 }}>
          <span className="emoji">
            {shown.critter}
            <span className="hat">{shown.hat}</span>
          </span>
          <span className="t-bubble">{shown.msg}</span>
        </div>
      </div>
    );
  }

  // finale: a parade of critters + a centered banner + confetti
  return (
    <div className="t-cheer" aria-hidden>
      {shown.confetti.map((c, i) => (
        <span key={`c${i}`} className="t-confetti" style={{ left: `${c.left}%`, animationDelay: `${c.delay}s` }}>
          {c.hat}
        </span>
      ))}
      {shown.parade.map((p, i) => (
        <div
          key={i}
          className="t-critter t-streak-fast"
          style={{ top: `${p.top}%`, left: 0, animationDelay: `${p.delay}s` }}
        >
          <span className="emoji">
            {p.critter}
            <span className="hat">{p.hat}</span>
          </span>
        </div>
      ))}
      <div className="t-finale-banner">
        <div style={{ fontSize: 40 }}>🎉</div>
        <div className="big">{shown.finaleMsg}</div>
      </div>
    </div>
  );
}
