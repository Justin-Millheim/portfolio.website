"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import SallyMark from "./SallyMark";

type Mode = "choose" | "signin" | "signup" | "forgot";

// First-run gate: create an account, sign in, reset a password, or continue as
// a guest. Guest keeps songs on-device; signing in syncs across devices and is
// the seam to shareable-later (PRD §12). Mirrors the /recipes gate.
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
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/sally` : undefined;
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
    <div className="sb-wrap sb-narrow sb-fadein" style={{ paddingTop: 56 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="sb-bob" style={{ display: "inline-block" }}>
          <SallyMark size={84} expression="delighted" />
        </div>
        <h1 className="sb-serif" style={{ fontSize: 30, fontWeight: 600, margin: "10px 0 4px" }}>
          Sally <span style={{ color: "var(--sb-ember)" }}>the Songbird</span>
        </h1>
        <p style={{ color: "var(--sb-muted)", fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>
          A late-night writing room with a very opinionated bird.
        </p>
      </div>

      {mode === "choose" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button className="sb-btn sb-btn-primary sb-btn-block" onClick={() => reset("signin")}>Sign in</button>
          <button className="sb-btn sb-btn-ghost sb-btn-block" onClick={() => reset("signup")}>Create account</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--sb-line)" }} />
            <span className="sb-mono" style={{ fontSize: 11, color: "var(--sb-faint)" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--sb-line)" }} />
          </div>
          <button className="sb-btn sb-btn-quiet sb-btn-block" onClick={onGuest}>Continue as guest</button>
          <p className="sb-mono" style={{ textAlign: "center", color: "var(--sb-faint)", fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
            Guest keeps your songs on this device only.<br />Sign in to sync across devices.
          </p>
          {!supabase && (
            <p className="sb-mono" style={{ textAlign: "center", color: "var(--sb-brass)", fontSize: 11, marginTop: 4 }}>
              Cloud sync isn&apos;t configured for this deployment yet — guest works now.
            </p>
          )}
        </div>
      ) : mode === "forgot" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>Reset your password</h2>
          <p style={{ fontSize: 13, color: "var(--sb-muted)", margin: "0 0 6px", lineHeight: 1.55 }}>
            Enter your email and we&apos;ll send a link to set a new password.
          </p>
          <div>
            <label className="sb-label">Email</label>
            <input type="email" autoComplete="email" inputMode="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          {error && <p style={{ color: "var(--sb-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--sb-brass)", fontSize: 13, margin: 0 }}>{notice}</p>}
          <button className="sb-btn sb-btn-primary sb-btn-block" onClick={sendReset} disabled={loading}>
            {loading ? "…" : "Send reset link →"}
          </button>
          <button className="sb-btn sb-btn-quiet sb-btn-block" onClick={() => reset("signin")}>← Back to sign in</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>{mode === "signin" ? "Sign in" : "Create your account"}</h2>
          <div>
            <label className="sb-label">Email</label>
            <input type="email" autoComplete="email" inputMode="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="sb-label">Password</label>
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p style={{ color: "var(--sb-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--sb-brass)", fontSize: 13, margin: 0 }}>{notice}</p>}
          <button className="sb-btn sb-btn-primary sb-btn-block" onClick={submit} disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign in →" : "Create account →"}
          </button>
          {mode === "signin" && (
            <button onClick={() => reset("forgot")} className="sb-mono"
              style={{ background: "none", border: "none", color: "var(--sb-brass)", fontSize: 12, cursor: "pointer", padding: 4 }}>
              Forgot password?
            </button>
          )}
          <button className="sb-btn sb-btn-quiet sb-btn-block" onClick={() => reset("choose")}>← Back</button>
        </div>
      )}
    </div>
  );
}
