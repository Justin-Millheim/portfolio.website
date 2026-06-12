// Trent the Tiger Trainer — the app mascot, hand-built as a scalable inline SVG
// so he renders crisply at every size with no asset/network dependency.
// Keeps the same { size, className, style } contract as before.

const C = {
  fur: "#ee7a2d",
  furDark: "#e0691c",
  cream: "#f7e3bf",
  creamShade: "#eed3a3",
  ink: "#1c140d",
  band: "#d83a2b",
  bandShade: "#b82c20",
  shorts: "#222b3a",
  shortsTrim: "#cdd6e2",
  nose: "#d9745a",
  tongue: "#e8697a",
  metal: "#aab1bb",
  metalShade: "#7d8590",
};

export default function Trent({
  size = 96,
  className,
  style,
  title = "Trent the Tiger Trainer",
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={title}
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* ===== BODY GROUP (shared cartoon outline) ===== */}
      <g
        stroke={C.ink}
        strokeWidth={3.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Tail — curls out to his left (viewer right) */}
        <path
          d="M126 150
             C160 146 182 162 178 182
             C176 194 160 196 154 186
             C150 179 156 172 163 175"
          fill="none"
          stroke={C.fur}
          strokeWidth={13}
        />
        <path
          d="M126 150
             C160 146 182 162 178 182
             C176 194 160 196 154 186
             C150 179 156 172 163 175"
          fill="none"
          strokeWidth={13.5}
          stroke={C.ink}
          strokeOpacity={0}
        />
        {/* tail stripes */}
        <g stroke="none" fill={C.ink}>
          <circle cx="150" cy="150" r="2.6" />
          <circle cx="171" cy="160" r="2.6" />
          <circle cx="176" cy="178" r="2.6" />
        </g>

        {/* Legs */}
        <path d="M84 162 L84 184 Q84 192 92 192 Q100 192 100 184 L100 162 Z" fill={C.fur} />
        <path d="M100 162 L100 184 Q100 192 108 192 Q116 192 116 184 L116 162 Z" fill={C.fur} />
        {/* feet pads */}
        <ellipse cx="91" cy="189" rx="8" ry="5" fill={C.cream} />
        <ellipse cx="109" cy="189" rx="8" ry="5" fill={C.cream} />

        {/* Torso (orange) */}
        <path
          d="M72 112
             C66 132 68 150 74 160
             C82 170 118 170 126 160
             C132 150 134 132 128 112 Z"
          fill={C.fur}
        />
        {/* Belly / bare chest (cream) */}
        <path
          d="M100 108
             C86 108 79 120 79 134
             C79 150 88 160 100 160
             C112 160 121 150 121 134
             C121 120 114 108 100 108 Z"
          fill={C.cream}
        />

        {/* Arms — hands on hips */}
        <path
          d="M76 116
             C62 120 56 136 62 148
             C66 156 78 156 82 150
             C78 146 76 138 80 130
             C83 124 84 120 82 116 Z"
          fill={C.fur}
        />
        <path
          d="M124 116
             C138 120 144 136 138 148
             C134 156 122 156 118 150
             C122 146 124 138 120 130
             C117 124 116 120 118 116 Z"
          fill={C.fur}
        />

        {/* Shorts */}
        <path
          d="M70 150
             Q70 142 80 142 L120 142 Q130 142 130 150 L130 166
             Q130 174 120 174 L114 174 L110 164 L90 164 L86 174 L80 174
             Q70 174 70 166 Z"
          fill={C.shorts}
        />

        {/* Head (orange base) */}
        <path
          d="M100 22
             C70 22 50 44 50 74
             C50 78 50 82 52 88
             C56 104 68 118 84 122
             C96 126 104 126 116 122
             C132 118 144 104 148 88
             C150 82 150 78 150 74
             C150 44 130 22 100 22 Z"
          fill={C.fur}
        />

        {/* Ears */}
        <path d="M60 44 C50 28 62 18 74 28 C80 33 80 44 74 50 Z" fill={C.fur} />
        <path d="M140 44 C150 28 138 18 126 28 C120 33 120 44 126 50 Z" fill={C.fur} />

        {/* Cream face mask */}
        <path
          d="M100 50
             C82 50 68 64 68 86
             C68 92 70 99 74 105
             C82 117 92 122 100 122
             C108 122 118 117 126 105
             C130 99 132 92 132 86
             C132 64 118 50 100 50 Z"
          fill={C.cream}
        />
      </g>

      {/* ===== DETAILS (no outline group) ===== */}
      {/* inner ears */}
      <path d="M64 42 C58 32 65 27 71 33 C74 36 74 42 71 45 Z" fill={C.creamShade} />
      <path d="M136 42 C142 32 135 27 129 33 C126 36 126 42 129 45 Z" fill={C.creamShade} />

      {/* forehead stripes */}
      <g fill={C.ink}>
        <path d="M100 30 C103 38 103 44 100 50 C97 44 97 38 100 30 Z" />
        <path d="M86 34 C90 40 91 46 88 52 C84 47 83 40 86 34 Z" />
        <path d="M114 34 C110 40 109 46 112 52 C116 47 117 40 114 34 Z" />
        {/* cheek stripes */}
        <path d="M70 78 C76 80 80 83 82 88 C76 88 71 85 68 81 Z" />
        <path d="M71 92 C77 93 81 96 83 100 C77 100 72 98 69 95 Z" />
        <path d="M130 78 C124 80 120 83 118 88 C124 88 129 85 132 81 Z" />
        <path d="M129 92 C123 93 119 96 117 100 C123 100 128 98 131 95 Z" />
      </g>

      {/* Headband (red) */}
      <path
        d="M49 58 Q100 38 151 58 L150 48 Q100 30 50 48 Z"
        fill={C.band}
        stroke={C.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M52 50 Q100 33 148 50" fill="none" stroke={C.bandShade} strokeWidth={2.4} strokeLinecap="round" />
      {/* knot + tails on his right side */}
      <path d="M47 52 l-9 -5 l3 9 l-8 1 l8 5 l-1 8 l7 -6 Z" fill={C.band} stroke={C.ink} strokeWidth={2.6} strokeLinejoin="round" />

      {/* Eyes */}
      <g>
        <ellipse cx="84" cy="80" rx="11.5" ry="13" fill="#ffffff" stroke={C.ink} strokeWidth={3} />
        <ellipse cx="116" cy="80" rx="11.5" ry="13" fill="#ffffff" stroke={C.ink} strokeWidth={3} />
        <circle cx="86" cy="82" r="5.4" fill={C.ink} />
        <circle cx="114" cy="82" r="5.4" fill={C.ink} />
        <circle cx="88" cy="80" r="1.8" fill="#ffffff" />
        <circle cx="116" cy="80" r="1.8" fill="#ffffff" />
      </g>

      {/* Nose */}
      <path
        d="M92 92 Q100 88 108 92 Q108 99 100 102 Q92 99 92 92 Z"
        fill={C.nose}
        stroke={C.ink}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />

      {/* Mouth + tongue */}
      <path d="M100 102 L100 108" stroke={C.ink} strokeWidth={2.8} strokeLinecap="round" />
      <path
        d="M84 108 Q92 116 100 110 Q108 116 116 108"
        fill="none"
        stroke={C.ink}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M97 112 Q100 121 107 114 Q104 110 100 110 Q98 110 97 112 Z" fill={C.tongue} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />

      {/* cheek freckles */}
      <g fill={C.ink} opacity={0.7}>
        <circle cx="74" cy="100" r="1.3" />
        <circle cx="79" cy="103" r="1.3" />
        <circle cx="126" cy="100" r="1.3" />
        <circle cx="121" cy="103" r="1.3" />
      </g>

      {/* Whistle on a cord */}
      <path d="M90 120 L101 134 M110 120 L101 134" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <g transform="rotate(18 101 137)">
        <rect x="93" y="132" width="16" height="10" rx="5" fill={C.metal} stroke={C.ink} strokeWidth={2.8} />
        <circle cx="107" cy="137" r="2" fill={C.metalShade} />
      </g>
    </svg>
  );
}
