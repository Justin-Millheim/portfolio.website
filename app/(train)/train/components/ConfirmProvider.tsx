"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import TrainPortal from "./TrainPortal";

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

// In-app confirm dialogs + toasts so the tool never depends on the browser's
// native confirm()/alert() (which a user can disable, breaking flows like Exit).
export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOpts | null>(null);
  const resolverRef = useRef<((r: ConfirmResult) => void) | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <ConfirmContext.Provider value={{ confirm, toast }}>
      {children}

      {dialog && (
        <TrainPortal>
        <div className="t-confirm-scrim" onClick={() => settle("cancel")}>
          <div className="t-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 style={{ fontSize: 19, margin: "0 0 8px" }}>{dialog.title}</h3>
            {dialog.message && (
              <p style={{ fontSize: 14, color: "var(--t-muted)", margin: "0 0 18px", lineHeight: 1.55 }}>{dialog.message}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className={`t-btn ${dialog.danger ? "t-btn-danger" : "t-btn-primary"}`}
                onClick={() => settle("confirm")}
              >
                {dialog.confirmLabel ?? "Confirm"}
              </button>
              {dialog.altLabel && (
                <button className="t-btn t-btn-ghost" onClick={() => settle("alt")}>{dialog.altLabel}</button>
              )}
              <button className="t-btn t-btn-quiet" onClick={() => settle("cancel")}>
                {dialog.cancelLabel ?? "Cancel"}
              </button>
            </div>
          </div>
        </div>
        </TrainPortal>
      )}

      {toastMsg && <TrainPortal><div className="t-toast" role="status">{toastMsg}</div></TrainPortal>}
    </ConfirmContext.Provider>
  );
}
