"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Mode = "choose" | "signin" | "signup" | "forgot";

// First-run gate: create an account, sign in, reset a password, or continue as
// a guest. Guest keeps everything on-device; signing in syncs across devices.
// Mirrors the /train and /recipes gates, themed for Tote.
export default function AuthGate({
  supabase, onGuest, onSignedIn,
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
    setError(null); setNotice(null);
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
    } finally { setLoading(false); }
  }

  async function sendReset() {
    setError(null); setNotice(null);
    if (!supabase) { setError("Cloud sync isn't set up for this site yet."); return; }
    if (!email) { setError("Enter your email."); return; }
    setLoading(true);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/tote` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setNotice("If an account exists for that email, we've sent a password reset link.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  return (
    <div className="t-app t-fadein" style={{ maxWidth: 420, paddingTop: 56 }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 50 }}>🛒</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 4px" }}>
          Tote
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>
          Smart grocery lists, recipes, and a weekly meal plan.
        </p>
      </div>

      {mode === "choose" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button className="t-btn t-btn-primary t-btn-block" onClick={() => reset("signin")}>Sign in</button>
          <button className="t-btn t-btn-ghost t-btn-block" onClick={() => reset("signup")}>Create account</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <button className="t-btn t-btn-quiet t-btn-block" onClick={onGuest}>Continue as guest</button>
          <p style={{ textAlign: "center", color: "var(--faint)", fontSize: 11.5, marginTop: 6, lineHeight: 1.6 }}>
            Guest keeps everything on this device only.<br />Sign in to sync across devices.
          </p>
          {!supabase && (
            <p style={{ textAlign: "center", color: "var(--coral-dk)", fontSize: 11.5, marginTop: 4 }}>
              Cloud sync isn&apos;t configured for this deployment yet — guest works now.
            </p>
          )}
        </div>
      ) : mode === "forgot" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>Reset your password</h2>
          <div>
            <label className="t-label">Email</label>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          {error && <p style={{ color: "var(--coral-dk)", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--teal-dk)", fontSize: 13, margin: 0 }}>{notice}</p>}
          <button className="t-btn t-btn-primary t-btn-block" onClick={sendReset} disabled={loading}>{loading ? "…" : "Send reset link →"}</button>
          <button className="t-btn t-btn-quiet t-btn-block" onClick={() => reset("signin")}>← Back to sign in</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>{mode === "signin" ? "Sign in" : "Create your account"}</h2>
          <div>
            <label className="t-label">Email</label>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="t-label">Password</label>
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p style={{ color: "var(--coral-dk)", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--teal-dk)", fontSize: 13, margin: 0 }}>{notice}</p>}
          <button className="t-btn t-btn-primary t-btn-block" onClick={submit} disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign in →" : "Create account →"}
          </button>
          {mode === "signin" && (
            <button onClick={() => reset("forgot")} style={{ background: "none", border: "none", color: "var(--teal-dk)", fontSize: 12.5, cursor: "pointer", padding: 4, fontWeight: 700 }}>
              Forgot password?
            </button>
          )}
          <button className="t-btn t-btn-quiet t-btn-block" onClick={() => reset("choose")}>← Back</button>
        </div>
      )}
    </div>
  );
}
