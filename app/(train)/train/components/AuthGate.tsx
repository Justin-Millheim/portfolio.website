"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Trent from "./Trent";

type Mode = "choose" | "signin" | "signup" | "forgot";

// First-run gate: create an account, sign in, reset a password, or continue as
// a guest. Guest keeps everything on-device; signing in syncs across devices.
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
        // If email confirmation is enabled in Supabase, send the user back to the
        // app (not a default/preview URL) after they confirm.
        const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/train` : undefined;
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
        if (error) throw error;
        if (data.session?.user) onSignedIn(data.session.user.id);
        else setNotice("Account created! Check your email to confirm, then sign in. (If you don't get an email, you can sign in right away.)");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session?.user) onSignedIn(data.session.user.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      // Friendlier guidance for the most common signup/sign-in snag.
      if (/email not confirmed/i.test(msg)) {
        setError("Your email isn't confirmed yet — check your inbox for the confirmation link, then sign in.");
      } else if (/invalid login credentials/i.test(msg)) {
        setError("That email and password don't match. Double-check, or create an account.");
      } else {
        setError(msg);
      }
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
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/train` : undefined;
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
    <div className="t-wrap t-fadein" style={{ paddingTop: 64, maxWidth: 420 }}>
      <div className="t-accent-tr" />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Trent size={120} style={{ margin: "0 auto" }} />
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 4px" }}>
          Trent the <span style={{ color: "var(--t-flame)" }}>Tiger Trainer</span>
        </h1>
        <p style={{ color: "var(--t-muted)", fontSize: 14, margin: 0 }}>
          I&apos;m your coach. Sign in to save our progress — or jump in as a guest.
        </p>
      </div>

      {mode === "choose" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="t-btn t-btn-primary" onClick={() => reset("signin")}>Sign in</button>
          <button className="t-btn t-btn-ghost" onClick={() => reset("signup")}>Create account</button>
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
      ) : mode === "forgot" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Reset your password</h2>
          <p style={{ fontSize: 13, color: "var(--t-muted)", margin: "0 0 6px", lineHeight: 1.55 }}>
            Enter your email and we&apos;ll send a link to set a new password.
          </p>
          <label>
            <div className="t-entry-label">Email</div>
            <input type="email" autoComplete="email" inputMode="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          {error && <p style={{ color: "#ff8a5c", fontSize: 13, margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "var(--t-amber)", fontSize: 13, margin: 0 }}>{notice}</p>}
          <button className="t-btn t-btn-primary" onClick={sendReset} disabled={loading}>
            {loading ? "…" : "Send reset link →"}
          </button>
          <button className="t-btn t-btn-quiet" onClick={() => reset("signin")}>← Back to sign in</button>
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

          {mode === "signin" && (
            <button onClick={() => reset("forgot")} className="t-mono"
              style={{ background: "none", border: "none", color: "var(--t-amber)", fontSize: 12, cursor: "pointer", padding: 4 }}>
              Forgot password?
            </button>
          )}
          <button className="t-btn t-btn-quiet" onClick={() => reset("choose")}>← Back</button>
        </div>
      )}
    </div>
  );
}
