"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ConfirmResult = "confirm" | "alt" | "cancel";
interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  altLabel?: string;
  danger?: boolean;
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

// Fully inline styles + a direct body portal so the dialog is always centered
// to the viewport (same approach as the /train and /recipes providers, dressed
// in Ink & Ember for the writing room).
const FONT_SANS = "'Hanken Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";
const btnBase: React.CSSProperties = {
  width: "100%", padding: 13, borderRadius: 11, border: "none",
  fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, letterSpacing: 0.4, cursor: "pointer",
};
const btn = {
  primary: { ...btnBase, background: "#E86A33", color: "#15110D" } as React.CSSProperties,
  danger: { ...btnBase, background: "#B03A2E", color: "#F1E8DC" } as React.CSSProperties,
  ghost: { ...btnBase, background: "#2A2017", border: "1px solid #34291D", color: "#F1E8DC" } as React.CSSProperties,
  quiet: { ...btnBase, background: "transparent", color: "#9A8C7C", fontWeight: 600, letterSpacing: 0 } as React.CSSProperties,
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
                zIndex: 2147483600, background: "rgba(15,12,8,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%", maxWidth: 360, background: "#211A14", border: "1px solid #34291D",
                  borderRadius: 16, padding: "22px 20px", boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                  color: "#F1E8DC", fontFamily: FONT_SANS,
                }}
              >
                <h3 style={{ fontSize: 18, margin: "0 0 8px", letterSpacing: "-0.2px" }}>{dialog.title}</h3>
                {dialog.message && (
                  <p style={{ fontSize: 14, color: "#9A8C7C", margin: "0 0 18px", lineHeight: 1.55 }}>{dialog.message}</p>
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
                zIndex: 2147483600, maxWidth: "90%", background: "#2A2017", border: "1px solid #34291D",
                color: "#F1E8DC", borderRadius: 999, padding: "11px 18px", fontSize: 13,
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
