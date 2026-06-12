// POST /api/sally/chat — Sally's conversational turn, streamed token-by-token
// as plain text (PRD §13.4). Runs on the chat-tier model.

import type Anthropic from "@anthropic-ai/sdk";
import { composeSystem, type SongContextInput } from "@/lib/sally/brain";
import { SALLY_MODELS } from "@/lib/sally/models";
import { getAnthropic, requireUser, studioOffline } from "@/lib/sally/server";
import type { Phase } from "@/lib/sally/types";

export const maxDuration = 120;

interface ChatBody {
  phase: Phase;
  context: SongContextInput;
  messages: { role: "sally" | "writer"; content: string }[];
  // Studio events ("the writer locked a style reference") let Sally react to
  // app actions without a typed writer message.
  event?: string;
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  const client = getAnthropic();
  if (!client) return studioOffline();

  const body = (await req.json()) as ChatBody;
  const turns: Anthropic.MessageParam[] = [];
  for (const m of body.messages ?? []) {
    turns.push({ role: m.role === "sally" ? "assistant" : "user", content: m.content });
  }
  if (body.event) {
    turns.push({
      role: "user",
      content: `[Studio note — not a message from the writer: ${body.event}. React in character, briefly.]`,
    });
  }
  // The API requires the first turn to be a user turn; Sally's opener is an
  // assistant message, so seed a silent walk-in beat when needed.
  if (!turns.length || turns[0].role !== "user") {
    turns.unshift({ role: "user", content: "[The writer just settled into the writing room.]" });
  }

  const stream = client.messages.stream({
    model: SALLY_MODELS.chat,
    max_tokens: 2000,
    system: composeSystem("chat", body.phase, body.context),
    messages: turns,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        console.error("[sally] chat stream", e);
        controller.error(e);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
