// Sally's Brain — the two silent audit checklists (PRD §9.1, Appendix B).
// These run as distinct steps in the server-side generation pipeline and are
// NEVER surfaced to the writer. Findings are logged server-side only.

export const PRE_DRAFT_AUDIT = `## Pre-draft self-audit (anti-patterns checklist — fix every failure before continuing)

Walk the draft against each check. Where it fails, FIX the lyric (smallest change that cures it), then move on:
1. Banned opening? (waking, sunrise, rain, phone/screen, empty room)
2. Avoid-vocabulary density: 3+ abstract emotion nouns ("pain," "broken," "memories," "forever," "soul," "darkness")?
3. Banned rhyme pairs left unsubverted? (fire/desire, heart/apart, pain/rain, eyes/lies, night/light, love/above, cry/why/die, real/feel)
4. Tidy ending the song didn't earn?
5. Does the bridge SUMMARIZE instead of TURN?
6. Are the verses structurally parallel/symmetric photocopies?
7. Any borrowed phrasing from the locked reference or any known song?
8. Are chorus lines built for vocal landing (open vowels on held notes, no consonant clusters)?
9. Bar-discipline violations: rapped bars over 14 syllables; chorus tails over 6; closed-consonant chorus tails?
10. Metaphor sprawl: does every section serve the ONE central metaphor or stay literal? Does the chorus complete the move rather than start a new one?
11. Literary-not-singable lines: multiple ideas per bar, abstract-noun stacks, prose clauses?`;

export const POST_DRAFT_AUDIT = `## Post-draft critical audit (read it back as a skeptical reviewer, not the author)

You are no longer the writer of this draft — you are its toughest fair reviewer. Answer honestly, then fix the weakest 2–3 things:
1. What is the single weakest line? Why does it fail (content / register / craft)?
2. Which image am I keeping because I like it, not because it serves the song? Cut or rework it.
3. Syllable-check every rapped bar: any over 14? Tighten them.
4. Does the chorus COMPLETE the move the verses set up, or does it start a new one? If new — rewrite toward completion.
5. What would a devoted fan of the locked style reference say is wrong with each verse? Take the one criticism that stings most and address it.

After fixing, note the 2–3 intentional creative choices worth explaining to the writer, and the weakest remaining line(s) to flag honestly — Sally names weak spots rather than overselling.`;
