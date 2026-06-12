// Server-only helpers for Sally's API routes. The Anthropic key lives here and
// never reaches the client (PRD §13.5). Audit findings are logged server-side
// for tuning Sally's Brain and never surfaced to the writer (PRD §13.3).

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { SALLY_MODELS } from "./models";

// ---------------------------------------------------------------------------
// Clients & auth
// ---------------------------------------------------------------------------

let _anthropic: Anthropic | null | undefined;
export function getAnthropic(): Anthropic | null {
  if (_anthropic !== undefined) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  _anthropic = key ? new Anthropic({ apiKey: key }) : null;
  return _anthropic;
}

export function studioOffline(): Response {
  return Response.json(
    { error: "Sally's studio isn't wired up yet — set ANTHROPIC_API_KEY in the environment." },
    { status: 503 },
  );
}

// When Supabase is configured, every call must carry a valid user token (the
// key behind these routes costs real money). Without Supabase configured
// (local dev / preview), the routes stay open.
export async function requireUser(req: Request): Promise<{ ok: true } | { ok: false; res: Response }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: true };
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return { ok: false, res: Response.json({ error: "Sign in to write with Sally." }, { status: 401 }) };
  }
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, res: Response.json({ error: "Session expired — sign in again." }, { status: 401 }) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Structured-output JSON schemas (additionalProperties:false everywhere; no
// unsupported constraints — see claude-api structured outputs rules)
// ---------------------------------------------------------------------------

const nullable = (t: object) => ({ anyOf: [t, { type: "null" }] });

const SECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["label", "kind", "delivery_cue", "lines"],
  properties: {
    label: { type: "string" },
    kind: { type: "string", enum: ["verse", "prechorus", "chorus", "bridge", "hook", "intro", "outro", "other"] },
    delivery_cue: nullable({ type: "string" }),
    lines: { type: "array", items: { type: "string" } },
  },
} as const;

export const OUTLINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "working_title", "emotional_core", "emotional_arc", "central_metaphor",
    "late_turn", "structure", "chorus_concept", "reasoning", "sally_message",
  ],
  properties: {
    working_title: { type: "string" },
    emotional_core: { type: "string" },
    emotional_arc: { type: "string" },
    central_metaphor: { type: "string" },
    late_turn: nullable({ type: "string" }),
    structure: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "summary"],
        properties: { label: { type: "string" }, summary: { type: "string" } },
      },
    },
    chorus_concept: { type: "string" },
    reasoning: { type: "string" },
    sally_message: { type: "string" },
  },
} as const;

export const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "sections"],
  properties: {
    title: { type: "string" },
    sections: { type: "array", items: SECTION_SCHEMA },
  },
} as const;

export const PRE_AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "sections", "findings"],
  properties: {
    title: { type: "string" },
    sections: { type: "array", items: SECTION_SCHEMA },
    findings: { type: "array", items: { type: "string" } },
  },
} as const;

export const POST_AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "sections", "creative_notes", "weak_lines", "findings", "sally_message"],
  properties: {
    title: { type: "string" },
    sections: { type: "array", items: SECTION_SCHEMA },
    creative_notes: { type: "array", items: { type: "string" } },
    weak_lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "line", "note"],
        properties: {
          section: { type: "string" },
          line: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    findings: { type: "array", items: { type: "string" } },
    sally_message: { type: "string" },
  },
} as const;

export const REVISE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["section", "alternatives", "sally_message"],
  properties: {
    section: nullable(SECTION_SCHEMA),
    alternatives: nullable({
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["approach", "section"],
        properties: {
          approach: { type: "string" },
          section: SECTION_SCHEMA,
        },
      },
    }),
    sally_message: { type: "string" },
  },
} as const;

export const SUNO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt", "variations", "sally_message"],
  properties: {
    prompt: { type: "string" },
    variations: { type: "array", items: { type: "string" } },
    sally_message: { type: "string" },
  },
} as const;

// ---------------------------------------------------------------------------
// Call helpers
// ---------------------------------------------------------------------------

function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export function parseModelJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

// One structured-output call. Streams internally (long generations stay under
// HTTP timeouts) and returns the parsed JSON. Opus calls get adaptive thinking.
export async function callStructured<T>(opts: {
  model: string;
  system: string;
  user: string;
  schema: object;
  maxTokens?: number;
  thinking?: boolean;
}): Promise<T> {
  const client = getAnthropic();
  if (!client) throw new Error("ANTHROPIC_API_KEY missing");
  const stream = client.messages.stream({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 16000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    ...(opts.thinking ? { thinking: { type: "adaptive" as const } } : {}),
    output_config: { format: { type: "json_schema" as const, schema: opts.schema as Record<string, unknown> } },
  });
  const msg = await stream.finalMessage();
  return parseModelJson<T>(extractText(msg));
}

// ---------------------------------------------------------------------------
// Suno cap enforcement (PRD §11 — counted in app code, never trusted to the
// model alone)
// ---------------------------------------------------------------------------

const STYLE_STOPWORDS = new Set([
  "the", "a", "an", "of", "by", "like", "something", "and", "or", "with", "song",
  "track", "vibe", "vibes", "feat", "ft", "version", "live", "remix",
]);

// Capitalized tokens from the locked reference are likely artist/title words.
export function styleNameTokens(styleReference: string | null): string[] {
  if (!styleReference) return [];
  return styleReference
    .split(/[^A-Za-z']+/)
    .filter((w) => w.length > 2 && /^[A-Z]/.test(w) && !STYLE_STOPWORDS.has(w.toLowerCase()));
}

export function containsArtistLeak(prompt: string, styleReference: string | null): boolean {
  const tokens = styleNameTokens(styleReference);
  const lower = prompt.toLowerCase();
  return tokens.some((t) => new RegExp(`\\b${t.toLowerCase()}\\b`).test(lower));
}

// Last-resort programmatic trim: drop trailing comma-separated tags until under
// the cap (the model-side compress pass runs first and follows the prescribed
// cut order: redundant adjectives → overlapping tags → implied descriptors →
// filler tempo words → non-essential negatives).
export function hardTrimSuno(prompt: string, cap = 1000): string {
  if (prompt.length <= cap) return prompt;
  const parts = prompt.split(/,\s*/);
  let out = "";
  for (const p of parts) {
    const candidate = out ? `${out}, ${p}` : p;
    if (candidate.length > cap) break;
    out = candidate;
  }
  return out || prompt.slice(0, cap);
}

export async function compressSunoPrompt(prompt: string, reason: string): Promise<string> {
  const client = getAnthropic();
  if (!client) return prompt;
  const msg = await client.messages.stream({
    model: SALLY_MODELS.utility,
    max_tokens: 1500,
    system:
      "You compress Suno style prompts. Return ONLY the revised prompt text — no preamble, no quotes. Keep it dense and comma-separated. Preserve the musical intent. Cut in this order: redundant adjectives, overlapping tags, implied descriptors, filler tempo words, non-essential negatives. NEVER include artist or band names — replace any with sonic descriptions.",
    messages: [{ role: "user", content: `${reason}\n\nPrompt:\n${prompt}` }],
  }).finalMessage();
  return extractText(msg).trim();
}

export async function enforceSunoRules(rawPrompt: string, styleReference: string | null): Promise<string> {
  let prompt = rawPrompt.trim();
  const overCap = prompt.length > 1000;
  const leak = containsArtistLeak(prompt, styleReference);
  if (overCap || leak) {
    const reasons: string[] = [];
    if (overCap) reasons.push(`It is ${prompt.length} characters; it must be under 1000.`);
    if (leak) reasons.push("It appears to name an artist/band — remove and replace with sonic description.");
    try {
      prompt = await compressSunoPrompt(prompt, reasons.join(" "));
    } catch (e) {
      console.error("[sally] suno compress failed", e);
    }
  }
  return hardTrimSuno(prompt.trim());
}
