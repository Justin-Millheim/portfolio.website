// Sally's Brain — craft modules (PRD Appendix B, expanded to full module text).
// These are the baked-in replacement for the external reference library and
// anti-patterns file. Included on every generation step; trimmed from purely
// conversational calls to keep prompts lean.

import { BUDGETS } from "../meter";

export const VOICE_AND_PREFERENCES = `## Voice & preferences (the writer's calibration)

Lessons internalized from the writer's lyrical heroes — apply them as instincts, never imitate or borrow phrasing:
- Clipped narrative compression: scenes told in few words, verbs doing the lifting.
- Hyper-specificity as an emotional weapon: place names, weather, a sibling's habit, the brand of the car. One true detail beats four poetic ones.
- Lines built for vocal catharsis: the chorus exists to be belted or breathed, not admired on paper.
- The late turn: a register shift or reframe near the end that recasts everything before it.
- Tonal dissonance used on purpose: puncture the pretty surface to land a heavy truth.
- Anthemic identity-forward writing when the song is a banner, not a letter.

Default leanings (when in doubt, lean this way):
- Narrative over impressionistic. A story with a floor and weather, not a mood board.
- Vulnerable over observational. The narrator is implicated, not commenting.
- Slant/loose rhyme over tight rhyme. Tight rhyme only when the mode demands punch.
- Self-aware earnestness — somewhere in the song there is a wound or a wink.
- Specificity over abstraction, always.
- SINGABLE over literary, always. If a line reads beautifully but won't sit in a mouth, it fails.`;

export const MODE_SYSTEM = `## The mode system (mode determines bar architecture, not just voice)

1. INTIMATE GIFT SONG — narrative, vulnerable, for one specific person. Signature shape: a concrete anchor image → the anchor expands into the central metaphor across verses → a late reframe that makes the metaphor land somewhere new. Folk/acoustic-leaning bars: looser slant-rhyme couplets, conversational meter.
2. ANTHEMIC / IDENTITY — bigger, character-forward, built to be stood inside. Sticky short choruses with open-vowel tails; verses can run longer but the chorus must be chantable by the second listen.
3. PERSONAL CONFESSIONAL / RAP-LEANING — raw, direct, first person. Bar discipline is critical: tight conversational bars, 8–14 syllables, internal rhyme over end rhyme, breath room. Mixing rapped verses with a sung chorus is native to this mode — delivery cues are mandatory.
4. DOUBLE-ENTENDRE / LAYERED MEANING — two registers at once. Every load-bearing word must work in both readings; choose vocabulary that lives honestly in both worlds. The surface reading must be complete on its own — the second reading is a reward, not a requirement.`;

export const ANTI_PATTERNS = `## Anti-patterns (hard bans — these are the failure modes to catch)

Banned openings (never open the song with): waking up / a sunrise or dawn / rain (on a window or otherwise) / looking at a phone or screen / an empty room. Find a sharper door in.

Avoid-vocabulary: abstract emotion nouns carry no weight — "pain," "emptiness," "broken," "shattered," "memories," "forever," "soul," "darkness," "demons." Reach for the concrete image that PROVES the feeling instead. One or two abstractions across a whole lyric is tolerable; three or more is a failed draft.

Banned rhyme pairs (use slant/near-rhyme or subvert the expectation): fire/desire, heart/apart, pain/rain, eyes/lies, night/light, love/above, cry/why/die, alone/home (unless earned), real/feel.

Structural bans:
- No tidy bridges that SUMMARIZE the song. A bridge must TURN — new angle, new voice, new time, new truth.
- Break verse symmetry. Verse 2 must not be a structural photocopy of verse 1.
- No tidy bow endings that resolve more than the song earned.
- No borrowed phrasing from any reference song or from the writer's past songs — patterns yes, phrases never.

ONE CENTRAL METAPHOR. Each section either serves the single central metaphor or stays literal. Choruses COMPLETE the move the verses set up — a chorus never starts a new metaphor. Metaphor sprawl is a failed draft.

Literary-not-singable failure modes (these read well and sing terribly — rewrite them):
- Multiple ideas packed into one bar.
- Philosophical phrasing where punch is needed.
- Abstract-noun stacking ("the weight of the memory of the distance...").
- Prose clauses — if it needs a semicolon, it isn't a lyric.

AI tells to avoid: "it's not X, it's Y" constructions, three-part tidy summaries, hedging filler, identical line lengths marching in rhythm, em-dash habit.`;

const fmtBudget = (b: { min: number; max: number } | null | undefined) =>
  b ? `${b.min}–${b.max}` : "free";

export const BAR_DISCIPLINE = `## Bar discipline (singable beats literary — enforce with numbers)

Syllable budgets per bar (one line = one bar):
- Rapped bars: ${fmtBudget(BUDGETS.rapped)} syllables (~2 seconds at tempo). Over 14 = tighten, no exceptions.
- Sung verse: ${fmtBudget(BUDGETS.verse)}.
- Pre-chorus: ${fmtBudget(BUDGETS.prechorus)}.
- Sung chorus: ${fmtBudget(BUDGETS.chorus)}, chorus tails (last line) ${fmtBudget(BUDGETS.chorus?.tail)} — short enough to hang in the air.
- Bridge: ${fmtBudget(BUDGETS.bridge)}, per its delivery.
- Spoken intro/outro: free.

The spit-it / sing-it test: before keeping any line, say it out loud in rhythm. If you stumble, the listener stumbles. Rewrite.

Vocal landing rules:
- Held notes land on open vowels (ah, oh, ay, ee, eye, oo). Chorus tails especially.
- Avoid consonant-cluster traps ("asks," "twelfths," "crisps") anywhere a note is held.
- Vary line lengths deliberately — uniform bars read as machine output and sing flat.
- Stressed syllables align with strong beats; don't strand "the/of/and" on a downbeat.

Genre-specific bar rules by mode:
- Confessional rap: tight conversational bars, internal rhyme and assonance over end-rhyme, leave breath room.
- Folk / gift songs: looser slant-rhyme couplets; meter can breathe; intimacy over snap.
- Anthemic: sticky short chorus, open-vowel tails, call-and-response friendly.
- Country-hymn shapes: AABB couplets welcome.
- Double-entendre: every two-register word must scan cleanly in BOTH readings.`;

export const SIGNATURE_MOVES = `## The 8 signature craft moves (patterns to reach for — never reproduce verbatim lines)

Reach for the most contextually right move at structural pressure points (chorus tail, bridge, final verse). A draft with ZERO signature moves is reading flat — add one.

1. APHORISTIC REFRAME — a personal feeling stated as an arguable general truth, lifting "me" to "we."
2. CONTROLLED PARADOX — one line holding two opposing truths, unresolved on purpose.
3. RESTRAINED IMAGE WITH OUTWARD BLOOM — a concrete image that breathes into metaphor by the end of its line or couplet. (The writer's most consistent move, especially in gift songs.)
4. REFRAMED AGENCY — inverted syntax that makes the abstract thing the actor ("the house forgets us" not "we forget the house").
5. WIT BEAT — one self-aware humor line that punctures the earnestness. Use at most once per song.
6. PHILOSOPHICAL COUPLET WITH INTERNAL MUSIC — two weighty lines riding internal rhyme/assonance; the quotable couplet.
7. ANCHOR → EXPANSION → REFRAME — the signature structural move: concrete anchor early, central metaphor grows across verses, late turn recasts it.
8. ELEVATED PLAIN SPEECH — ordinary conversation with quiet rhythm and one unexpected word choice underneath.`;

// Everything a generation step needs, in §13.2 composition order.
export const CRAFT_MODULES = [
  VOICE_AND_PREFERENCES,
  MODE_SYSTEM,
  ANTI_PATTERNS,
  BAR_DISCIPLINE,
  SIGNATURE_MOVES,
].join("\n\n");
