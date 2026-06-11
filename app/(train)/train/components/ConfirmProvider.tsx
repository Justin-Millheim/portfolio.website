"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ConfirmResult = "confirm" | "alt" | "cancel";
interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  altLabel?: string;       // optional third action (e.g. "Discard")
  danger?: boolean;        // style the primary action as destructive
}
interface Ctx {
  confirm: (o: ConfirmOpts) => Promise<ConfirmResult>;
  toast: (message: string) => void;
}

const ConfirmContext = createContext<Ctx | null>(null);

export function useConfirm(): Ctx {
  const c = useContext(ConfirmContext);
  if (!c) throw new Error("useConfirm must be used within ConfirmProvider");
  return c;
}

// Fully inline styles + a direct body portal so the dialog is always centered to
// the viewport — it can never be trapped offscreen by an ancestor's containing
// block, and never depends on themed CSS being in scope.
const FONT_SANS = "Georgia, 'Times New Roman', serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";
const btnBase: React.CSSProperties = {
  width: "100%", padding: 14, borderRadius: 12, border: "none",
  fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, letterSpacing: 1,
  textTransform: "uppercase", cursor: "pointer",
};
const btn = {
  primary: { ...btnBase, background: "linear-gradient(135deg,#ff6a32,#ffae3d)", color: "#fff" } as React.CSSProperties,
  danger: { ...btnBase, background: "linear-gradient(135deg,#e0533a,#c2410c)", color: "#fff" } as React.CSSProperties,
  ghost: { ...btnBase, background: "#1e1e1e", border: "1px solid #333", color: "#f4f1ea" } as React.CSSProperties,
  quiet: { ...btnBase, background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#b4aca0", textTransform: "none", letterSpacing: 0 } as React.CSSProperties,
};

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOpts | null>(null);
  const resolverRef = useRef<((r: ConfirmResult) => void) | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const confirm = useCallback((o: ConfirmOpts) => {
    return new Promise<ConfirmResult>((resolve) => {
      resolverRef.current = resolve;
      setDialog(o);
    });
  }, []);

  const settle = (r: ConfirmResult) => {
    setDialog(null);
    resolverRef.current?.(r);
    resolverRef.current = null;
  };

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const overlays = mounted && typeof document !== "undefined"
    ? createPortal(
        <>
          {dialog && (
            <div
              onClick={() => settle("cancel")}
              style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 2147483600, background: "rgba(0,0,0,0.72)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%", maxWidth: 360, background: "#141414", border: "1px solid #2a2a2a",
                  borderRadius: 18, padding: "22px 20px", boxShadow: "0 14px 44px rgba(0,0,0,0.6)",
                  color: "#f4f1ea", fontFamily: FONT_SANS,
                }}
              >
                <h3 style={{ fontSize: 19, margin: "0 0 8px", letterSpacing: "-0.3px" }}>{dialog.title}</h3>
                {dialog.message && (
                  <p style={{ fontSize: 14, color: "#b4aca0", margin: "0 0 18px", lineHeight: 1.55 }}>{dialog.message}</p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button style={dialog.danger ? btn.danger : btn.primary} onClick={() => settle("confirm")}>
                    {dialog.confirmLabel ?? "Confirm"}
                  </button>
                  {dialog.altLabel && (
                    <button style={btn.ghost} onClick={() => settle("alt")}>{dialog.altLabel}</button>
                  )}
                  <button style={btn.quiet} onClick={() => settle("cancel")}>{dialog.cancelLabel ?? "Cancel"}</button>
                </div>
              </div>
            </div>
          )}

          {toastMsg && (
            <div
              role="status"
              style={{
                position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)",
                zIndex: 2147483600, maxWidth: "90%", background: "#1d1d1d", border: "1px solid #2a2a2a",
                color: "#f4f1ea", borderRadius: 999, padding: "11px 18px", fontSize: 13,
                fontFamily: FONT_SANS, boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
              }}
            >
              {toastMsg}
            </div>
          )}
        </>,
        document.body
      )
    : null;

  return (
    <ConfirmContext.Provider value={{ confirm, toast }}>
      {children}
      {overlays}
    </ConfirmContext.Provider>
  );
}
