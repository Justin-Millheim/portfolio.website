// Per-phase model configuration — the cost/quality dial (PRD §13.1).
// Drafting + audits run on the strongest model because the two silent audits
// are the methodology's core quality mechanism; conversation, outlining, and
// the Suno prompt run on Sonnet; quick utility passes run on Haiku.
//
// To save money, point `draft`/`audit`/`revise` at "claude-sonnet-4-6"; to
// splurge on an important gift song, leave them on Opus.

export const SALLY_MODELS = {
  chat: "claude-sonnet-4-6",
  outline: "claude-sonnet-4-6",
  draft: "claude-opus-4-8",
  audit: "claude-opus-4-8",
  revise: "claude-opus-4-8",
  suno: "claude-sonnet-4-6",
  utility: "claude-haiku-4-5",
} as const;

export type SallyCallKind = keyof typeof SALLY_MODELS;
