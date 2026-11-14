/** Original PMForge mascot, "Forge". Anime-inspired, drawn in SVG. Gains gear as the tier rises (1 to 7). */
type Props = { tier: number; size?: number; silhouette?: boolean; className?: string };

const SKIN = "#FFD9B8", HAIR = "#1B1240", HAIR_HI = "#7E3BED", VIOLET = "#7E3BED", DEEP = "#4B1FA6", LIME = "#C6FF34", INK = "#0D0D12";

function Star({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <path className="pm-twinkle" style={{ animationDelay: `${d}s`, transformOrigin: `${x}px ${y}px` }} fill={LIME}
      d={`M${x} ${y - 7 * s} L${x + 2 * s} ${y - 2 * s} L${x + 7 * s} ${y} L${x + 2 * s} ${y + 2 * s} L${x} ${y + 7 * s} L${x - 2 * s} ${y + 2 * s} L${x - 7 * s} ${y} L${x - 2 * s} ${y - 2 * s} Z`} />
  );
}

export function Character({ tier, size = 240, silhouette = false, className = "" }: Props) {
  const t = Math.min(Math.max(tier, 1), 7);
  const id = `g${t}`;
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} role="img" aria-label={`Forge character, form ${t} of 7`}
      className={`${className} ${silhouette ? "brightness-0 opacity-40" : ""}`}>
      <defs>
        <radialGradient id={`${id}-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={LIME} stopOpacity="0.55" /><stop offset="60%" stopColor={VIOLET} stopOpacity="0.25" /><stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
      </defs>

      {t >= 3 && <circle className="pm-aura" cx="100" cy="125" r={t >= 6 ? 108 : 90} fill={`url(#${id}-aura)`} />}
      {t >= 6 && <circle className="pm-spin" cx="100" cy="125" r="100" fill="none" stroke={LIME} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 10" />}

      <g className="pm-float">
        {t >= 7 && (
          <g className="pm-flap" style={{ transformOrigin: "100px 140px" }}>
            <path d="M92 130 C40 90 10 100 6 150 C30 140 52 150 70 170 C64 150 76 140 92 150 Z" fill={LIME} fillOpacity="0.8" />
            <path d="M108 130 C160 90 190 100 194 150 C170 140 148 150 130 170 C136 150 124 140 108 150 Z" fill={LIME} fillOpacity="0.8" />
          </g>
        )}
        {t >= 4 && <path d="M70 130 C50 180 56 205 70 214 L130 214 C144 205 150 180 130 130 Z" fill={DEEP} />}

        <ellipse cx="100" cy="226" rx="38" ry="6" fill="#000" fillOpacity="0.35" />
        <rect x="76" y="198" width="18" height="22" rx="8" fill={INK} /><rect x="106" y="198" width="18" height="22" rx="8" fill={INK} />
        <rect x="72" y="214" width="26" height="9" rx="4" fill={t >= 3 ? LIME : "#fff"} /><rect x="102" y="214" width="26" height="9" rx="4" fill={t >= 3 ? LIME : "#fff"} />

        <path d="M68 140 Q100 126 132 140 L138 204 Q100 214 62 204 Z" fill={VIOLET} />
        <path d="M100 138 L100 206" stroke={LIME} strokeWidth="3" strokeLinecap="round" />
        {t >= 5 && (
          <g>
            <ellipse cx="66" cy="142" rx="16" ry="11" fill="#cfd2ff" stroke={LIME} strokeWidth="2" />
            <ellipse cx="134" cy="142" rx="16" ry="11" fill="#cfd2ff" stroke={LIME} strokeWidth="2" />
          </g>
        )}
        {t >= 6 && <path d="M100 160 l10 6 v12 l-10 6 l-10 -6 v-12 z" fill={INK} stroke={LIME} strokeWidth="2" />}

        <ellipse cx="62" cy="168" rx="9" ry="14" fill={SKIN} transform="rotate(12 62 168)" />
        <ellipse cx="138" cy="168" rx="9" ry="14" fill={SKIN} transform="rotate(-12 138 168)" />

        {/* prop in the right hand, changes per tier */}
        <g transform="translate(142 168)">
          {t === 1 && <g><rect x="-2" y="-18" width="22" height="28" rx="3" fill="#fff" /><path d="M2 -12 h14 M2 -6 h14 M2 0 h10" stroke={VIOLET} strokeWidth="2" /></g>}
          {t === 2 && <g><circle cx="10" cy="-14" r="10" fill="none" stroke={LIME} strokeWidth="3" /><path d="M17 -7 l10 12" stroke={LIME} strokeWidth="4" strokeLinecap="round" /></g>}
          {t === 3 && <g><rect x="6" y="-34" width="6" height="40" rx="2" fill="#a07840" /><rect x="-6" y="-40" width="30" height="14" rx="3" fill={LIME} /></g>}
          {t === 4 && <g><rect x="8" y="-46" width="4" height="54" fill="#fff" /><path d="M12 -46 h28 l-8 9 l8 9 h-28 z" fill={LIME} /></g>}
          {t === 5 && <g><path d="M-4 -26 h32 v22 q0 16 -16 22 q-16 -6 -16 -22 z" fill={INK} stroke={LIME} strokeWidth="3" /><rect x="6" y="-12" width="12" height="10" rx="2" fill={LIME} /><path d="M9 -12 v-4 a3 3 0 0 1 6 0 v4" fill="none" stroke={LIME} strokeWidth="2" /></g>}
          {t === 6 && <g><rect x="-6" y="-34" width="34" height="26" rx="3" fill="#102a6b" stroke={LIME} strokeWidth="2" /><path d="M0 -28 h22 M0 -22 h14 M0 -16 h20" stroke="#fff" strokeWidth="1.5" /></g>}
          {t === 7 && <g><circle className="pm-aura" cx="10" cy="-12" r="14" fill={LIME} fillOpacity="0.9" /><circle cx="10" cy="-12" r="7" fill="#fff" /></g>}
        </g>

        {/* head */}
        <path d="M58 92 C54 40 146 40 142 92 C148 58 130 30 100 30 C70 30 52 58 58 92 Z" fill={HAIR} />
        <circle cx="100" cy="92" r="46" fill={SKIN} />
        <path d="M54 88 C52 48 82 34 100 44 C118 34 150 52 146 88 C140 70 128 62 114 64 C104 52 96 52 86 64 C72 62 60 72 54 88 Z" fill={HAIR} />
        <path d="M62 70 C70 54 84 50 92 56" stroke={HAIR_HI} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M100 44 C96 30 104 22 114 24 C108 30 108 36 106 46 Z" fill={HAIR} />

        <g>
          <ellipse cx="80" cy="96" rx="11" ry="14" fill="#fff" /><ellipse cx="120" cy="96" rx="11" ry="14" fill="#fff" />
          <ellipse cx="81" cy="98" rx="8" ry="11" fill={VIOLET} /><ellipse cx="119" cy="98" rx="8" ry="11" fill={VIOLET} />
          <ellipse cx="81" cy="99" rx="4.5" ry="7" fill={INK} /><ellipse cx="119" cy="99" rx="4.5" ry="7" fill={INK} />
          <circle cx="84" cy="93" r="3.2" fill="#fff" /><circle cx="122" cy="93" r="3.2" fill="#fff" />
          <circle cx="78" cy="103" r="1.6" fill={LIME} /><circle cx="116" cy="103" r="1.6" fill={LIME} />
          <path d="M68 84 q12 -8 24 0 M108 84 q12 -8 24 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        <ellipse cx="68" cy="112" rx="7" ry="4" fill="#ff9db4" fillOpacity="0.7" /><ellipse cx="132" cy="112" rx="7" ry="4" fill="#ff9db4" fillOpacity="0.7" />
        <path d="M92 118 q8 8 16 0" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {t >= 2 && <g><rect x="56" y="62" width="88" height="9" rx="4" fill={LIME} /><path d="M100 60 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1 z" fill={VIOLET} /></g>}
        {t >= 3 && <g><rect x="70" y="40" width="26" height="14" rx="7" fill={INK} stroke={LIME} strokeWidth="2" /><rect x="104" y="40" width="26" height="14" rx="7" fill={INK} stroke={LIME} strokeWidth="2" /><path d="M96 47 h8" stroke={LIME} strokeWidth="3" /></g>}
        {t >= 6 && <g fill="none" stroke={LIME} strokeWidth="2.5"><rect x="66" y="84" width="30" height="24" rx="8" /><rect x="104" y="84" width="30" height="24" rx="8" /><path d="M96 94 h8" /></g>}
        {t >= 7 && (
          <g>
            <ellipse className="pm-aura" cx="100" cy="22" rx="30" ry="7" fill="none" stroke={LIME} strokeWidth="4" />
            <path d="M80 34 l6 -14 l8 10 l6 -14 l6 14 l8 -10 l6 14 z" fill={LIME} stroke={INK} strokeWidth="1.5" />
          </g>
        )}
      </g>

      {t >= 3 && <><Star x={30} y={60} s={1.1} /><Star x={172} y={80} s={0.9} d={0.6} /></>}
      {t >= 5 && <><Star x={24} y={150} s={0.8} d={1.1} /><Star x={178} y={170} s={1} d={0.3} /></>}
      {t >= 6 && (
        <g className="pm-orbit" style={{ transformOrigin: "100px 125px" }}>
          <rect x="6" y="110" width="22" height="16" rx="3" fill="#102a6b" stroke={LIME} strokeWidth="1.5" />
          <rect x="172" y="110" width="22" height="16" rx="3" fill="#102a6b" stroke={LIME} strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
