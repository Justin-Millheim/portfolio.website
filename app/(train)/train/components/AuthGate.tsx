"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// First-run gate: create an account, sign in, or continue as a guest.
// Guest keeps everything on-device; signing in syncs across devices.
export default function AuthGate({
  supabase,
  onGuest,
  onSignedIn,
}: {
  supabase: SupabaseClient | null;
  onGuest: () => void;
  onSignedIn: (userId: string) => void;
}) {
  const [mode, setMode] = useState<"choose" | "signin" | "signup">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!supabase) {
      setError("Cloud sync isn't set up for this site yet — continue as guest for now.");
      return;
    }
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

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 64, maxWidth: 420 }}>
      <div className="t-accent-tr" />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 44 }}>🔥</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 4px" }}>
          Burn <span style={{ color: "var(--t-flame)" }}>Mode</span>
        </h1>
        <p style={{ color: "var(--t-muted)", fontSize: 14, margin: 0 }}>
          Your guided workout companion.
        </p>
      </div>

      {mode === "choose" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="t-btn t-btn-primary" onClick={() => setMode("signin")}>Sign in</button>
          <button className="t-btn t-btn-ghost" onClick={() => setMode("signup")}>Create account</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--t-line)" }} />
            <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--t-line)" }} />
          </div>
          <button className="t-btn t-btn-quiet" onClick={onGuest}>Continue as guest</button>
          <p className="t-mono" style={{ textAlign: "center", color: "var(--t-faint)", fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
            Guest keeps your history on this device only.<br />Sign in to sync across devices.
          </p>
          {!supabase && (
            <p className="t-mono" style={{ textAlign: "center", color: "var(--t-amber)", fontSize: 11, marginTop: 4 }}>
              Cloud sync isn&apos;t configured for this deployment yet — guest works now.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h2>
          <label>
            <div className="t-entry-label">Email</div>
            <input type="email" autoComplete="email" inputMode="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            <div className="t-entry-label">Password</div>
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>

          {error && <p style={{ color: "#ff8a5c", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--t-amber)", fontSize: 13, margin: 0 }}>{notice}</p>}

          <button className="t-btn t-btn-primary" onClick={submit} disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign in →" : "Create account →"}
          </button>
          <button className="t-btn t-btn-quiet" onClick={() => { setMode("choose"); setError(null); setNotice(null); }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
