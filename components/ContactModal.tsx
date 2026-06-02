"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";

// Web3Forms access keys are public by design (used in client-side code; abuse is
// handled by Web3Forms' spam protection, not key secrecy). The Vercel env var
// overrides this fallback when present.
const ACCESS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || "91c4fd0e-c7ed-4493-8341-349d50047309";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    setError("");
    started.current = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => firstRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("access_key", ACCESS_KEY);
    formData.append("subject", "New message from justinmillheim.com");
    formData.append("from_name", "justinmillheim.com");

    setStatus("sending");
    setError("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        track("contact_submit");
        setStatus("success");
        form.reset();
      } else {
        track("contact_error", { reason: "api" });
        setStatus("error");
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      track("contact_error", { reason: "network" });
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <motion.div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Send Justin a message"
            onMouseDown={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduce ? 0.12 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="modal-close" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </button>

            {status === "success" ? (
              <div className="modal-success">
                <CheckCircle2 size={42} />
                <h3 className="serif">Message sent</h3>
                <p>Thanks for reaching out &mdash; I&rsquo;ll get back to you soon.</p>
                <button className="btn solid" onClick={onClose}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="eyebrow">Get in touch</div>
                <h3 className="serif modal-title">Send me a message</h3>
                <p className="modal-sub">Tell me what you&rsquo;re working on, or just say hi.</p>
                <form
                  onSubmit={handleSubmit}
                  className="modal-form"
                  onFocus={() => {
                    if (!started.current) {
                      started.current = true;
                      track("contact_start");
                    }
                  }}
                >
                  <input ref={firstRef} name="name" required placeholder="Your name" autoComplete="name" />
                  <input name="email" type="email" required placeholder="Your email" autoComplete="email" />
                  <textarea name="message" required placeholder="Your message" rows={4} />
                  <input type="checkbox" name="botcheck" style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  {status === "error" && <p className="modal-error">{error}</p>}
                  <button className="btn solid" type="submit" disabled={status === "sending"}>
                    {status === "sending" ? (
                      <>
                        <Loader2 size={15} className="spin" /> Sending&hellip;
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Send message
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
