"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import SallyMark from "./SallyMark";

// Shown when a password-recovery link lands on /sally (PASSWORD_RECOVERY auth
// event). Sets the new password on the already-established recovery session.
export default function SetPasswordScreen({
  supabase,
  onDone,
}: {
  supabase: SupabaseClient | null;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!supabase) { setError("Cloud sync isn't configured."); return; }
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("Those don't match."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sb-wrap sb-narrow sb-fadein" style={{ paddingTop: 64 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <SallyMark size={64} expression="idle" />
        <h1 className="sb-serif" style={{ fontSize: 24, margin: "10px 0 4px" }}>Set a new password</h1>
        <p style={{ color: "var(--sb-muted)", fontSize: 14 }}>Then we&apos;ll get right back to the songs.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label className="sb-label">New password</label>
          <input type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <div>
          <label className="sb-label">Confirm it</label>
          <input type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p style={{ color: "var(--sb-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
        <button className="sb-btn sb-btn-primary sb-btn-block" onClick={submit} disabled={loading}>
          {loading ? "…" : "Save password →"}
        </button>
      </div>
    </div>
  );
}
