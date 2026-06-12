"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/sally/types";
import SallyMark, { type SallyExpression } from "./SallyMark";

// The conversation rail — Sally ↔ writer back-and-forth with the songbird
// avatar (PRD §14.2). Streams Sally's replies token-by-token.
export default function Conversation({
  messages,
  streamingText,
  busy,
  busyNote,
  onSend,
}: {
  messages: ChatMessage[];
  streamingText: string | null;
  busy: boolean;       // a chat turn is in flight
  busyNote: string | null; // non-chat work in progress ("Sally is writing…")
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, streamingText, busyNote]);

  function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    onSend(text);
  }

  const expression: SallyExpression = busyNote || busy ? "thinking" : "idle";

  return (
    <div className="sb-chat">
      <div className="sb-chat-scroll" ref={scrollRef}>
        {messages.map((m) =>
          m.role === "sally" ? (
            <div key={m.id} className="sb-msg sb-msg-sally">
              <div className="sb-msg-avatar"><SallyMark size={30} expression="idle" /></div>
              <div className="sb-msg-bubble">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="sb-msg sb-msg-writer">
              <div className="sb-msg-bubble">{m.content}</div>
            </div>
          ),
        )}

        {streamingText !== null && (
          <div className="sb-msg sb-msg-sally">
            <div className="sb-msg-avatar"><SallyMark size={30} expression="thinking" /></div>
            <div className="sb-msg-bubble">
              {streamingText || <span className="sb-typing"><i /><i /><i /></span>}
            </div>
          </div>
        )}

        {busyNote && streamingText === null && (
          <div className="sb-msg sb-msg-sally">
            <div className="sb-msg-avatar sb-bob"><SallyMark size={30} expression={expression} /></div>
            <div className="sb-msg-bubble sb-msg-note">{busyNote}</div>
          </div>
        )}
      </div>

      <div className="sb-composer">
        <textarea
          value={draft}
          rows={2}
          placeholder={busy ? "Sally's mid-thought…" : "Talk to Sally…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={busy}
        />
        <button className="sb-btn sb-btn-primary sb-send" onClick={send} disabled={busy || !draft.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
