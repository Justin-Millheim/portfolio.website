// Tiny Web Audio "ding" with no shipped asset. Browsers block audio until a
// user gesture, so call unlockAudio() from a tap (Start/Approve) first.

let ctx: AudioContext | null = null;
const MUTE_KEY = "train.muted";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Call on a user gesture to satisfy autoplay policies (esp. iOS).
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

// Pleasant two-note chime to signal a timer finished.
export function playDing(): void {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const now = c.currentTime;
  const notes = [880, 1320]; // A5 -> E6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.14;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

// Short haptic on supporting devices (Android Chrome; iOS Safari ignores it).
export function buzz(): void {
  if (isMuted()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(120); } catch { /* noop */ }
  }
}

export function cheerFx(): void {
  playDing();
  buzz();
}
