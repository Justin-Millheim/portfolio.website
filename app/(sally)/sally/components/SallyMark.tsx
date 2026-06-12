"use client";

// Sally herself — a cartoonized hero songbird (owner decision: a legit
// character animal, not an abstract mark). Ember plumage on the Ink & Ember
// palette, with three expression states used across the app:
//   idle      — bright-eyed, ready
//   thinking  — lidded eye, head tilted, working on it
//   delighted — eyes-closed singing, notes in the air

export type SallyExpression = "idle" | "thinking" | "delighted";

export default function SallyMark({
  size = 40,
  expression = "idle",
  className,
}: {
  size?: number;
  expression?: SallyExpression;
  className?: string;
}) {
  const tilt = expression === "thinking" ? "rotate(-7 32 36)" : undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g transform={tilt}>
        {/* tail feathers */}
        <path d="M16 40 C7 38 3 31 5 23 C9 29 13 32 19 33 Z" fill="#B5511F" />
        <path d="M18 44 C9 45 4 41 3 34 C8 38 13 39 19 38 Z" fill="#8C3A16" />
        {/* body */}
        <ellipse cx="33" cy="40" rx="19" ry="16.5" fill="#E86A33" />
        {/* belly */}
        <ellipse cx="37" cy="45" rx="11.5" ry="9.5" fill="#F1E8DC" />
        {/* wing */}
        <path d="M21 38 C19 30 25 24 33 26 C28 32 28 40 31 47 C26 46 22 43 21 38 Z" fill="#C4551E" />
        {/* head */}
        <circle cx="44" cy="23" r="13.5" fill="#E86A33" />
        {/* crest */}
        <path d="M38 12 C36 7 38 3 43 2 C41 6 42 9 44 11 Z" fill="#C4551E" />
        <path d="M44 10 C44 5 48 2 53 3 C50 6 49 9 49 12 Z" fill="#E86A33" />
        {/* beak */}
        {expression === "delighted" ? (
          <>
            <path d="M56 18 L64 21 L57 24 Z" fill="#C99A52" />
            <path d="M56 26 L63 27 L56 30 Z" fill="#B0803C" />
          </>
        ) : (
          <path d="M56.5 20 L64 23.5 L56.5 27 C57.5 24.8 57.5 22.2 56.5 20 Z" fill="#C99A52" />
        )}
        {/* eye */}
        {expression === "delighted" ? (
          <path
            d="M43.5 21.5 C45 19.2 48.4 19.2 50 21.5"
            stroke="#2A1408"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ) : (
          <>
            <circle cx="46.6" cy="21.5" r="4.8" fill="#FFF8EE" />
            <circle
              cx={expression === "thinking" ? 45.4 : 47.6}
              cy={expression === "thinking" ? 20 : 22.2}
              r="2.5"
              fill="#2A1408"
            />
            <circle
              cx={expression === "thinking" ? 46.3 : 48.6}
              cy={expression === "thinking" ? 19.2 : 21.2}
              r="0.9"
              fill="#FFF8EE"
            />
            {expression === "thinking" && (
              <path d="M41.4 17.2 C43.2 15.4 49 15.2 51.4 17.6" stroke="#C4551E" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </>
        )}
        {/* legs */}
        <path d="M29 56 L29 61 M26.4 61 L31.4 61" stroke="#8C3A16" strokeWidth="2" strokeLinecap="round" />
        <path d="M37 56 L37 61 M34.4 61 L39.4 61" stroke="#8C3A16" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* notes in the air when she's singing */}
      {expression === "delighted" && (
        <g fill="#C99A52">
          <g className="sb-note sb-note-1">
            <circle cx="10" cy="14" r="2.4" />
            <path d="M12.1 14 L12.1 4.5 L18 3 L18 6 L13.6 7.2" stroke="#C99A52" strokeWidth="1.7" fill="none" />
          </g>
          <g className="sb-note sb-note-2">
            <circle cx="22" cy="9" r="1.9" />
            <path d="M23.7 9 L23.7 2" stroke="#C99A52" strokeWidth="1.5" fill="none" />
          </g>
        </g>
      )}
    </svg>
  );
}
