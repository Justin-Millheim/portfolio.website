"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Mode = "choose" | "signin" | "signup" | "forgot";

// First-run gate: create an account, sign in, reset a password, or continue as
// a guest. Guest keeps the recipe box on-device; signing in syncs across
// devices and is the seam to multi-user (PRD Phase 3). Mirrors /train's gate.
export default function AuthGate({
  supabase,
  onGuest,
  onSignedIn,
}: {
  supabase: SupabaseClient | null;
  onGuest: () => void;
  onSignedIn: (userId: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset(next: Mode) { setMode(next); setError(null); setNotice(null); }

  async function submit() {
    setError(null);
    setNotice(null);
    if (!supabase) { setError("Cloud sync isn't set up for this site yet — continue as guest for now."); return; }
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session?.user) onSignedIn(data.session.user.id);
        else setNotice("Account created. Check your email to confirm, then sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session?.user) onSignedIn(data.session.user.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function sendReset() {
    setError(null);
    setNotice(null);
    if (!supabase) { setError("Cloud sync isn't set up for this site yet."); return; }
    if (!email) { setError("Enter your email."); return; }
    setLoading(true);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/recipes` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setNotice("If an account exists for that email, we've sent a password reset link. Check your inbox.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="r-wrap r-narrow r-fadein" style={{ paddingTop: 56 }}>
      <div className="r-accent-tr" />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 50 }}>🍲</div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: "8px 0 4px" }}>
          Mise <span style={{ color: "var(--r-tomato)" }}>Recipe Box</span>
        </h1>
        <p style={{ color: "var(--r-muted)", fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>
          Capture, organize, scale, and search every recipe you cook.
        </p>
      </div>

      {mode === "choose" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button className="r-btn r-btn-primary r-btn-block" onClick={() => reset("signin")}>Sign in</button>
          <button className="r-btn r-btn-ghost r-btn-block" onClick={() => reset("signup")}>Create account</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--r-line)" }} />
            <span className="r-mono" style={{ fontSize: 11, color: "var(--r-faint)" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--r-line)" }} />
          </div>
          <button className="r-btn r-btn-quiet r-btn-block" onClick={onGuest}>Continue as guest</button>
          <p className="r-mono" style={{ textAlign: "center", color: "var(--r-faint)", fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
            Guest keeps your recipes on this device only.<br />Sign in to sync across devices.
          </p>
          {!supabase && (
            <p className="r-mono" style={{ textAlign: "center", color: "var(--r-amber)", fontSize: 11, marginTop: 4 }}>
              Cloud sync isn&apos;t configured for this deployment yet — guest works now.
            </p>
          )}
        </div>
      ) : mode === "forgot" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>Reset your password</h2>
          <p style={{ fontSize: 13, color: "var(--r-muted)", margin: "0 0 6px", lineHeight: 1.55 }}>
            Enter your email and we&apos;ll send a link to set a new password.
          </p>
          <div>
            <label className="r-label">Email</label>
            <input type="email" autoComplete="email" inputMode="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          {error && <p style={{ color: "var(--r-tomato-dk)", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--r-herb-dk)", fontSize: 13, margin: 0 }}>{notice}</p>}
          <button className="r-btn r-btn-primary r-btn-block" onClick={sendReset} disabled={loading}>
            {loading ? "…" : "Send reset link →"}
          </button>
          <button className="r-btn r-btn-quiet r-btn-block" onClick={() => reset("signin")}>← Back to sign in</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>{mode === "signin" ? "Sign in" : "Create your account"}</h2>
          <div>
            <label className="r-label">Email</label>
            <input type="email" autoComplete="email" inputMode="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="r-label">Password</label>
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p style={{ color: "var(--r-tomato-dk)", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--r-herb-dk)", fontSize: 13, margin: 0 }}>{notice}</p>}
          <button className="r-btn r-btn-primary r-btn-block" onClick={submit} disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign in →" : "Create account →"}
          </button>
          {mode === "signin" && (
            <button onClick={() => reset("forgot")} className="r-mono"
              style={{ background: "none", border: "none", color: "var(--r-herb-dk)", fontSize: 12, cursor: "pointer", padding: 4 }}>
              Forgot password?
            </button>
          )}
          <button className="r-btn r-btn-quiet r-btn-block" onClick={() => reset("choose")}>← Back</button>
        </div>
      )}
    </div>
  );
}
