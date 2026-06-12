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

// Inline styles + a direct body portal so the dialog is always centered to the
// viewport and never depends on themed CSS being in scope. (Same approach as the
// /train and /recipes providers, restyled for Tote's teal/coral palette.)
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const btnBase: React.CSSProperties = {
  width: "100%", padding: 14, borderRadius: 12, border: "none",
  fontFamily: FONT, fontSize: 14.5, fontWeight: 700, cursor: "pointer",
};
const btn = {
  primary: { ...btnBase, background: "#0f9d8e", color: "#fff" } as React.CSSProperties,
  danger: { ...btnBase, background: "#f2674e", color: "#fff" } as React.CSSProperties,
  ghost: { ...btnBase, background: "#ffffff", border: "1px solid #d3dad4", color: "#17302a" } as React.CSSProperties,
  quiet: { ...btnBase, background: "transparent", color: "#5d6b64", fontWeight: 600 } as React.CSSProperties,
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
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const overlays = mounted && typeof document !== "undefined"
    ? createPortal(
        <>
          {dialog && (
            <div
              onClick={() => settle("cancel")}
              style={{
                position: "fixed", inset: 0, zIndex: 2147483600, background: "rgba(23,48,42,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
              }}
            >
              <div
                role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%", maxWidth: 360, background: "#ffffff", border: "1px solid #e4e8e4",
                  borderRadius: 16, padding: "22px 20px", boxShadow: "0 14px 44px rgba(23,48,42,0.25)",
                  color: "#17302a", fontFamily: FONT,
                }}
              >
                <h3 style={{ fontSize: 18.5, margin: "0 0 8px", fontWeight: 800 }}>{dialog.title}</h3>
                {dialog.message && (
                  <p style={{ fontSize: 14, color: "#5d6b64", margin: "0 0 18px", lineHeight: 1.55 }}>{dialog.message}</p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button style={dialog.danger ? btn.danger : btn.primary} onClick={() => settle("confirm")}>
                    {dialog.confirmLabel ?? "Confirm"}
                  </button>
                  {dialog.altLabel && <button style={btn.ghost} onClick={() => settle("alt")}>{dialog.altLabel}</button>}
                  <button style={btn.quiet} onClick={() => settle("cancel")}>{dialog.cancelLabel ?? "Cancel"}</button>
                </div>
              </div>
            </div>
          )}

          {toastMsg && (
            <div
              role="status"
              style={{
                position: "fixed", left: "50%", bottom: 92, transform: "translateX(-50%)",
                zIndex: 2147483600, maxWidth: "90%", background: "#17302a", color: "#eef1ef",
                borderRadius: 999, padding: "11px 18px", fontSize: 13.5, fontFamily: FONT,
                boxShadow: "0 6px 20px rgba(23,48,42,0.35)",
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
