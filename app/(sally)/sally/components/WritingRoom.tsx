"use client";

import { useMemo, useState } from "react";
import type {
  ChatMessage, Draft, DraftSection, Mode, Outline, Phase, Song, SongBundle, StyleAnchor, SunoPrompt,
} from "@/lib/sally/types";
import { MODE_LABELS } from "@/lib/sally/types";
import { getStore } from "@/lib/sally/store";
import { newId, nowIso, renderLyricSheet } from "@/lib/sally/format";
import {
  buildContext, renderTranscript, sallyChat, sallyDraft, sallyOutline, sallyRevise, sallySuno,
  toDraftSection, toRawSection, type RawSection,
} from "@/lib/sally/api";
import { useConfirm } from "./ConfirmProvider";
import PhaseStepper from "./PhaseStepper";
import Conversation from "./Conversation";
import IntakePanel from "./IntakePanel";
import OutlinePanel from "./OutlinePanel";
import WritePanel from "./WritePanel";
import LyricSheet, { type ActionRequest } from "./LyricSheet";
import SunoPanel from "./SunoPanel";

// The Writing Room (PRD §14.2): conversation rail + work surface + phase
// stepper. This component owns the song's state machine — the gates live
// here, in app logic, never in the model's hands.

export default function WritingRoom({
  initial,
  onExit,
}: {
  initial: SongBundle;
  onExit: () => void;
}) {
  const { toast, confirm } = useConfirm();

  const [song, setSong] = useState<Song>(initial.song);
  const [outlines, setOutlines] = useState<Outline[]>(initial.outlines);
  const [drafts, setDrafts] = useState<Draft[]>(initial.drafts);
  const [suno, setSuno] = useState<SunoPrompt | null>(initial.suno);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);

  const [chatBusy, setChatBusy] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [draftStage, setDraftStage] = useState<number | null>(null);
  const [busySection, setBusySection] = useState<{ label: string; action: ActionRequest["action"] } | null>(null);
  const [sunoBusy, setSunoBusy] = useState(false);
  const [viewVersion, setViewVersion] = useState<number | null>(null); // null = latest
  const [alts, setAlts] = useState<{ target: DraftSection; options: { approach: string; section: RawSection }[] } | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "work">("work");

  const latestOutline = outlines[outlines.length - 1] ?? null;
  const approvedOutline = useMemo(
    () => [...outlines].reverse().find((o) => o.approved) ?? null,
    [outlines],
  );
  const latestDraft = drafts[drafts.length - 1] ?? null;
  const viewedDraft = viewVersion === null
    ? latestDraft
    : drafts.find((d) => d.version === viewVersion) ?? latestDraft;
  const allLocked = !!latestDraft && latestDraft.sections.length > 0 && latestDraft.sections.every((s) => s.locked);

  const anyBusy = chatBusy || outlineBusy || draftStage !== null || !!busySection || sunoBusy;

  const reachable: Record<Phase, boolean> = {
    1: true,
    2: !!approvedOutline,
    3: drafts.length > 0,
    4: allLocked || !!suno,
  };

  const busyNote =
    outlineBusy ? "Sally is sketching the outline…"
    : draftStage !== null ? (draftStage === 1 ? "Sally is writing…" : draftStage === 2 ? "Humming it back to herself…" : "One last read-through…")
    : busySection ? `Sally is reworking ${busySection.label}…`
    : sunoBusy ? "Sally's in the booth…"
    : null;

  // ---- persistence helpers -------------------------------------------------

  async function persistSong(next: Song) {
    const stamped = { ...next, updatedAt: nowIso() };
    setSong(stamped);
    await getStore().saveSong(stamped);
  }

  async function addMsg(role: "sally" | "writer", content: string, phase?: Phase): Promise<ChatMessage> {
    const m: ChatMessage = {
      id: newId(),
      songId: song.id,
      phase: phase ?? song.currentPhase,
      role,
      content,
      createdAt: nowIso(),
    };
    setMessages((prev) => [...prev, m]);
    await getStore().addMessage(m);
    return m;
  }

  // ---- chat ----------------------------------------------------------------

  async function runChat(history: ChatMessage[], event?: string) {
    setChatBusy(true);
    setStreamingText("");
    try {
      const full = await sallyChat(
        {
          phase: song.currentPhase,
          context: buildContext({ song, outline: approvedOutline ?? latestOutline, draft: latestDraft }),
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          event,
        },
        (text) => setStreamingText(text),
      );
      setStreamingText(null);
      if (full) await addMsg("sally", full);
    } catch (e) {
      setStreamingText(null);
      toast(e instanceof Error ? e.message : "Sally lost her train of thought — try again.");
    } finally {
      setChatBusy(false);
    }
  }

  async function sendChat(text: string) {
    const writerMsg = await addMsg("writer", text);
    await runChat([...messages, writerMsg]);
  }

  async function notifyEvent(event: string) {
    if (chatBusy) return;
    await runChat(messages, event);
  }

  // ---- phase 1: mode + style + outline --------------------------------------

  async function pickMode(mode: Mode) {
    if (song.mode === mode) return;
    await persistSong({ ...song, mode });
    void notifyEvent(
      `The writer chose the mode: ${MODE_LABELS[mode].name}. React briefly. If it's a gift song, start hunting for recipient specifics (quirks only they have, one true memory, their vibe, must-include names or places). Otherwise probe for the concrete details this mode needs.`,
    );
  }

  async function lockStyle(reference: string) {
    await persistSong({ ...song, styleReference: reference, styleLocked: true, styleBlind: false });
    void notifyEvent(
      `The writer locked the style reference: "${reference}". Propose a triangulation — where this song sits between that reference's qualities (storytelling weight, rawness, production) — plus the mode and a production direction, then ask them to confirm or recalibrate.`,
    );
  }

  async function unlockStyle() {
    await persistSong({ ...song, styleLocked: false });
  }

  async function blindToggle(blind: boolean) {
    await persistSong({ ...song, styleBlind: blind, styleLocked: false, styleReference: blind ? null : song.styleReference });
    if (blind) {
      void notifyEvent(
        `The writer toggled "you choose blind" — they're trusting your instincts on style. Acknowledge it briefly and say what sonic lane you're leaning toward given what you know so far.`,
      );
    }
  }

  async function generateOutline(feedback?: string) {
    if (!song.mode || !(song.styleLocked || song.styleBlind)) return;
    setOutlineBusy(true);
    try {
      const history = feedback ? [...messages, await addMsg("writer", feedback, 1)] : messages;
      const result = await sallyOutline({
        context: buildContext({ song }),
        transcript: renderTranscript(history),
        feedback: feedback ?? null,
      });
      const outline: Outline = {
        id: newId(),
        songId: song.id,
        version: latestOutline ? latestOutline.version + 1 : 1,
        workingTitle: result.working_title,
        emotionalCore: result.emotional_core,
        emotionalArc: result.emotional_arc,
        centralMetaphor: result.central_metaphor,
        lateTurn: result.late_turn,
        structure: result.structure,
        chorusConcept: result.chorus_concept,
        reasoning: result.reasoning,
        approved: false,
        createdAt: nowIso(),
      };
      await getStore().saveOutline(outline);
      setOutlines((prev) => [...prev, outline]);
      await persistSong({ ...song, title: result.working_title, currentPhase: 1 });
      await addMsg("sally", result.sally_message, 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "The outline pitch fell apart — try again.");
    } finally {
      setOutlineBusy(false);
    }
  }

  async function approveOutline() {
    if (!latestOutline) return;
    const approved = { ...latestOutline, approved: true };
    await getStore().saveOutline(approved);
    setOutlines((prev) => prev.map((o) => (o.id === approved.id ? approved : o)));
    await persistSong({
      ...song,
      title: approved.workingTitle,
      emotionalCore: approved.emotionalCore,
      centralMetaphor: approved.centralMetaphor,
      currentPhase: 2,
    });
    await addMsg(
      "sally",
      "Blueprint's approved — I love this shape. When you're ready, hit the big button and I'll write the first full draft, every bar against the outline we just shaped.",
      2,
    );
  }

  // ---- phase 2: the silent pipeline -----------------------------------------

  async function runDraft() {
    if (!approvedOutline) return;
    setDraftStage(1);
    try {
      let anchors: StyleAnchor[] = [];
      try { anchors = await getStore().styleAnchors(song.mode, song.id); } catch { /* corpus is optional */ }
      const result = await sallyDraft(
        { context: buildContext({ song, outline: approvedOutline, anchors }) },
        (stage) => setDraftStage(stage),
      );
      const draft: Draft = {
        id: newId(),
        songId: song.id,
        version: latestDraft ? latestDraft.version + 1 : 1,
        title: result.title,
        sections: result.sections.map((s) => toDraftSection(s)),
        creativeNotes: result.creativeNotes,
        weakLines: result.weakLines,
        createdAt: nowIso(),
      };
      await getStore().saveDraft(draft);
      setDrafts((prev) => [...prev, draft]);
      setViewVersion(null);
      await persistSong({ ...song, title: result.title, currentPhase: 3 });
      await addMsg("sally", result.sallyMessage, 3);
      if (result.creativeNotes.length || result.weakLines.length) {
        const noteLines = [
          result.creativeNotes.length ? "A few choices I made on purpose:" : "",
          ...result.creativeNotes.map((n) => `• ${n}`),
          result.weakLines.length
            ? `\nAnd honestly? ${result.weakLines
                .map((w) => `the line I'd poke at first is in the ${w.section} — “${w.line}” (${w.note})`)
                .join("; also ")}. Want me to take another swing at it right now?`
            : "",
        ].filter(Boolean);
        await addMsg("sally", noteLines.join("\n"), 3);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sally hit a snag mid-draft — give it another go.");
    } finally {
      setDraftStage(null);
    }
  }

  // ---- phase 3: sectional refinement -----------------------------------------

  function nextDraftFrom(replacedLabel: string, replacement: DraftSection): Draft {
    const base = latestDraft!;
    return {
      id: newId(),
      songId: song.id,
      version: base.version + 1,
      title: base.title,
      sections: base.sections.map((s) => (s.label === replacedLabel ? replacement : s)),
      creativeNotes: base.creativeNotes,
      weakLines: base.weakLines.filter((w) => w.section !== replacedLabel),
      createdAt: nowIso(),
    };
  }

  async function applyReplacement(target: DraftSection, raw: RawSection) {
    const replacement = toDraftSection({ ...raw, label: target.label }, false);
    const draft = nextDraftFrom(target.label, replacement);
    await getStore().saveDraft(draft);
    setDrafts((prev) => [...prev, draft]);
    setViewVersion(null);
  }

  async function handleAction(req: ActionRequest) {
    if (!latestDraft) return;

    if (req.action === "revise" && req.missType === "structure") {
      const r = await confirm({
        title: "That's a structure miss",
        message: "When the song's shape is wrong, the fix lives in the blueprint — revise the outline, then re-draft. Head back there?",
        confirmLabel: "To the blueprint",
        cancelLabel: "Stay here",
      });
      if (r !== "confirm") return;
      await addMsg(
        "sally",
        "Structure miss — the shape's wrong, not the words. Let's fix the blueprint; re-open it, tell me what the song should be doing, and I'll re-draft from there.",
        1,
      );
      await persistSong({ ...song, currentPhase: 1 });
      return;
    }

    setBusySection({ label: req.section.label, action: req.action });
    try {
      let anchors: StyleAnchor[] = [];
      try { anchors = await getStore().styleAnchors(song.mode, song.id); } catch { /* corpus is optional */ }
      const res = await sallyRevise({
        context: buildContext({ song, outline: approvedOutline, draft: latestDraft, anchors }),
        section: toRawSection(req.section),
        action: req.action,
        missType: req.missType ?? null,
        note: req.note ?? null,
      });
      if (req.action === "alternatives" && res.alternatives) {
        setAlts({ target: req.section, options: res.alternatives });
      } else if (res.section) {
        await applyReplacement(req.section, res.section);
      }
      await addMsg("sally", res.sally_message, 3);
    } catch (e) {
      toast(e instanceof Error ? e.message : "That rewrite didn't land — try the action again.");
    } finally {
      setBusySection(null);
    }
  }

  async function toggleLock(label: string) {
    if (!latestDraft) return;
    const updated: Draft = {
      ...latestDraft,
      sections: latestDraft.sections.map((s) => (s.label === label ? { ...s, locked: !s.locked } : s)),
    };
    await getStore().saveDraft(updated);
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    const nowAll = updated.sections.every((s) => s.locked);
    if (nowAll && !allLocked) {
      await addMsg("sally", "That's every section locked — the song stands. When you're ready: the booth.", 3);
    }
  }

  async function goSuno() {
    await persistSong({ ...song, currentPhase: 4 });
  }

  // ---- phase 4: the booth -----------------------------------------------------

  async function generateSuno(note?: string) {
    if (!latestDraft) return;
    setSunoBusy(true);
    try {
      const res = await sallySuno({
        context: buildContext({ song, outline: approvedOutline, draft: latestDraft }),
        lyricSheet: renderLyricSheet(latestDraft),
        note: note ?? null,
      });
      const prompt: SunoPrompt = {
        id: newId(),
        songId: song.id,
        prompt: res.prompt,
        charCount: res.charCount,
        variations: res.variations,
        createdAt: nowIso(),
      };
      await getStore().saveSuno(prompt);
      setSuno(prompt);
      await persistSong({ ...song, status: "complete", currentPhase: 4 });
      await addMsg("sally", res.sallyMessage, 4);
    } catch (e) {
      toast(e instanceof Error ? e.message : "The booth glitched — run it again.");
    } finally {
      setSunoBusy(false);
    }
  }

  // ---- misc ---------------------------------------------------------------

  async function copyText(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied`);
    } catch {
      toast("Couldn't reach the clipboard");
    }
  }

  async function goPhase(p: Phase) {
    if (!reachable[p] || p === song.currentPhase) return;
    if (p === 3) setViewVersion(null);
    await persistSong({ ...song, currentPhase: p });
  }

  // ---- render ---------------------------------------------------------------

  const phase = song.currentPhase;

  const workSurface = (
    <>
      {phase === 1 && (
        <>
          <IntakePanel
            song={song}
            busy={anyBusy}
            onPickMode={pickMode}
            onLockStyle={lockStyle}
            onUnlockStyle={unlockStyle}
            onBlindToggle={blindToggle}
          />
          {latestOutline ? (
            <OutlinePanel
              outline={latestOutline}
              totalVersions={outlines.length}
              busy={anyBusy}
              approvedAlready={latestOutline.approved}
              onRepitch={(fb) => generateOutline(fb)}
              onApprove={approveOutline}
            />
          ) : (
            song.mode && (song.styleLocked || song.styleBlind) && (
              <div className="sb-panel sb-fadein sb-write-cta">
                <button className="sb-btn sb-btn-primary sb-gate-btn sb-big" onClick={() => generateOutline()} disabled={anyBusy}>
                  {outlineBusy ? "Sally is sketching…" : "Sally, pitch me the outline →"}
                </button>
                <p className="sb-hint">She&apos;ll mine the conversation for your specifics and commit to one central metaphor.</p>
              </div>
            )
          )}
        </>
      )}

      {phase === 2 && approvedOutline && (
        <WritePanel
          outline={approvedOutline}
          draftCount={drafts.length}
          stage={draftStage}
          onWrite={runDraft}
        />
      )}

      {phase === 3 && viewedDraft && (
        <LyricSheet
          draft={viewedDraft}
          isLatest={viewedDraft.id === latestDraft?.id}
          versionCount={drafts.length}
          viewVersion={viewedDraft.version}
          onViewVersion={(v) => setViewVersion(v === latestDraft?.version ? null : v)}
          busySection={busySection}
          onAction={handleAction}
          onToggleLock={toggleLock}
          onCopy={() => copyText(renderLyricSheet(viewedDraft), "Lyric sheet")}
          onRedraft={async () => {
            const r = await confirm({
              title: "Re-draft from the blueprint?",
              message: "Sally writes a fresh full draft against the approved outline. Your current draft stays in the version history.",
              confirmLabel: "Re-draft",
              cancelLabel: "Keep this one",
            });
            if (r !== "confirm") return;
            await persistSong({ ...song, currentPhase: 2 });
          }}
          allLocked={allLocked}
          onGoSuno={goSuno}
          disabled={anyBusy}
        />
      )}

      {phase === 4 && (
        <SunoPanel
          suno={suno}
          busy={sunoBusy}
          onGenerate={(note) => generateSuno(note)}
          onCopy={(t) => copyText(t, "Copied to clipboard —")}
        />
      )}
    </>
  );

  return (
    <div className="sb-room">
      <header className="sb-room-head">
        <button className="sb-btn sb-btn-quiet sb-back" onClick={onExit}>← Library</button>
        <div className="sb-room-title">
          <span className="sb-serif">{song.title}</span>
          {song.mode && <span className="sb-mono sb-room-mode">{MODE_LABELS[song.mode].name}</span>}
        </div>
        <PhaseStepper current={phase} reachable={reachable} onGo={goPhase} />
        <div className="sb-mobile-tabs">
          <button className={mobileTab === "chat" ? "on" : ""} onClick={() => setMobileTab("chat")}>Sally</button>
          <button className={mobileTab === "work" ? "on" : ""} onClick={() => setMobileTab("work")}>The song</button>
        </div>
      </header>

      <div className="sb-room-body">
        <aside className={`sb-rail ${mobileTab === "chat" ? "show" : ""}`}>
          <Conversation
            messages={messages}
            streamingText={streamingText}
            busy={anyBusy}
            busyNote={busyNote}
            onSend={sendChat}
          />
        </aside>
        <main className={`sb-surface ${mobileTab === "work" ? "show" : ""}`}>{workSurface}</main>
      </div>

      {alts && (
        <div className="sb-modal-scrim" onClick={() => setAlts(null)}>
          <div className="sb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="sb-serif">Pick a take for {alts.target.label}</h3>
            <p className="sb-hint">Choose one, or close and ask Sally to mix them.</p>
            <div className="sb-alt-list">
              {alts.options.map((opt, i) => (
                <div key={i} className="sb-alt">
                  <div className="sb-alt-head">
                    <span className="sb-mono sb-alt-tag">{opt.approach}</span>
                    <button
                      className="sb-btn sb-btn-ghost"
                      onClick={async () => {
                        await applyReplacement(alts.target, opt.section);
                        setAlts(null);
                      }}
                    >
                      Use this one
                    </button>
                  </div>
                  <div className="sb-alt-lines sb-mono">
                    {opt.section.lines.map((l, j) => <div key={j}>{l}</div>)}
                  </div>
                </div>
              ))}
            </div>
            <button className="sb-btn sb-btn-quiet sb-btn-block" onClick={() => setAlts(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
