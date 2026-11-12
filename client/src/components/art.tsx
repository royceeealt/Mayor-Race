// Inline SVG art redrawn from design/*.png. Colours come from tokens.css variables.
import type { CSSProperties } from 'react';

export function StringLights() {
  const bulbs: [number, number][] = [[36, 56], [85, 43], [134, 28], [185, 9], [249, 9], [299, 28], [348, 43], [398, 56]];
  return (
    <svg className="lights" viewBox="0 0 441 80" aria-hidden="true">
      <defs>
        <radialGradient id="bulbGlow">
          <stop offset="0" stopColor="#fff9a8" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff9a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M-6 58 Q 70 62 135 28 T 200 -6" fill="none" stroke="var(--wire)" strokeWidth="2.4" />
      <path d="M241 -6 Q 300 22 350 44 T 448 60" fill="none" stroke="var(--wire)" strokeWidth="2.4" />
      {bulbs.map(([x, y], i) => (
        <g key={i} className="bulb" style={{ animationDelay: `${i * 0.37}s` } as CSSProperties}>
          <circle cx={x} cy={y} r="17" fill="url(#bulbGlow)" />
          <circle cx={x} cy={y} r="8.5" fill="#fff59a" />
        </g>
      ))}
    </svg>
  );
}

export function Cloud({ style, pale = false, width = 150 }: { style?: CSSProperties; pale?: boolean; width?: number }) {
  const fill = pale ? '#cfe9e5' : 'var(--cloud)';
  return (
    <svg className="cloud" style={style} width={width} viewBox="0 0 200 90" aria-hidden="true">
      <g fill={fill}>
        <circle cx="52" cy="58" r="26" />
        <circle cx="92" cy="40" r="36" />
        <circle cx="138" cy="54" r="30" />
        <circle cx="170" cy="62" r="20" />
        <rect x="26" y="56" width="164" height="26" rx="13" />
      </g>
      {!pale && <path d="M78 36 q10 -10 22 -2 M108 46 q8 -6 16 0" fill="none" stroke="#dcd2bd" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

export function Daisy({ size = 32, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 40 60" style={style} aria-hidden="true">
      <path d="M20 28 Q19 44 20 58" stroke="#3f7d5a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="14" cy="46" rx="2.6" ry="7" fill="#3f7d5a" transform="rotate(-35 14 46)" />
      <ellipse cx="26" cy="49" rx="2.6" ry="7" fill="#3f7d5a" transform="rotate(35 26 49)" />
      <g fill="#fbf6e6">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx="20" cy="9" rx="4.6" ry="7.6" transform={`rotate(${i * 45} 20 18)`} />
        ))}
      </g>
      <circle cx="20" cy="18" r="5.4" fill="#f6a21e" />
      <circle cx="18.5" cy="17" r="1" fill="#b36a00" />
      <circle cx="21.5" cy="19" r="1" fill="#b36a00" />
    </svg>
  );
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Daisies scattered over the meadow (positions are seeded, so they never jump between renders). */
export function Meadow({ seed = 7, count = 20 }: { seed?: number; count?: number }) {
  const r = rng(seed);
  // Jittered grid so daisies spread evenly instead of clumping.
  const cols = 5;
  const rows = Math.ceil(count / cols);
  const items = Array.from({ length: count }, (_, i) => {
    const c = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: ((c + 0.15 + r() * 0.7) / cols) * 100 - 2,
      y: ((row + 0.1 + r() * 0.75) / rows) * 92,
      s: 17 + r() * 8,
    };
  });
  return (
    <div className="layer" style={{ top: 'var(--horizon)' }} aria-hidden="true">
      {items.map((d, i) => (
        <Daisy key={i} size={d.s} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%` }} />
      ))}
    </div>
  );
}

/** Star bunting: alternating yellow and sage flags with slate stars on a sagging line. */
export function Bunting({ droop = 0, style }: { droop?: number; style?: CSSProperties }) {
  const n = 10;
  const flags = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const x = 18 + t * 564;
    const y = 12 + Math.sin(Math.PI * t) * (14 + droop);
    return { x, y, yellow: i % 2 === 0, rot: (t - 0.5) * 16 };
  });
  return (
    <svg className="board__bunting" style={style} viewBox="0 0 600 76" aria-hidden="true">
      <path d={`M0 6 Q300 ${44 + droop * 2} 600 6`} stroke="var(--chalk)" strokeWidth="1.6" strokeDasharray="3 3" fill="none" />
      {flags.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`}>
          <path d="M-23 -4 L23 -4 L0 46 Z" fill={f.yellow ? 'var(--yellow)' : 'var(--sage)'} />
          <path d="M0 8 l3 6.5 7 .8 -5.2 4.7 1.5 7 -6.3 -3.6 -6.3 3.6 1.5 -7 -5.2 -4.7 7 -.8z" fill="var(--slate)" />
        </g>
      ))}
    </svg>
  );
}

export function BushMounds() {
  return (
    <svg className="board__bushes" viewBox="0 0 700 90" preserveAspectRatio="none" aria-hidden="true">
      <g fill="#9dbe8c">
        <circle cx="30" cy="80" r="40" />
        <circle cx="105" cy="64" r="44" />
        <circle cx="195" cy="72" r="38" />
        <circle cx="285" cy="52" r="50" />
        <circle cx="385" cy="48" r="54" />
        <circle cx="470" cy="76" r="30" />
        <circle cx="530" cy="70" r="36" />
        <circle cx="600" cy="58" r="44" />
        <circle cx="680" cy="70" r="42" />
        <rect x="0" y="70" width="700" height="24" />
      </g>
    </svg>
  );
}

function Leaf({ x, y, rot, yellow }: { x: number; y: number; rot: number; yellow: boolean }) {
  return <ellipse cx={x} cy={y} rx="13" ry="7.5" fill={yellow ? 'var(--yellow)' : 'var(--sage)'} transform={`rotate(${rot} ${x} ${y})`} />;
}

/** The chalk doodles around the edge of every chalkboard: leaves (left), idea bulb (right), flowers and plants (corners). */
export function BoardDecor() {
  return (
    <>
      <svg className="board__deco" style={{ left: '3%', top: '36%', width: '9%' }} viewBox="0 0 40 130" aria-hidden="true">
        <Leaf x={20} y={14} rot={-28} yellow />
        <Leaf x={20} y={46} rot={28} yellow={false} />
        <Leaf x={20} y={78} rot={-28} yellow />
        <Leaf x={20} y={110} rot={28} yellow={false} />
      </svg>
      <svg className="board__deco" style={{ right: '4%', top: '24%', width: '12%' }} viewBox="0 0 60 70" aria-hidden="true">
        <g stroke="var(--yellow)" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <ellipse cx="30" cy="34" rx="12" ry="15" />
          <path d="M30 50 v4 M8 34 h-5 M52 34 h5 M14 14 l-4 -4 M46 14 l4 -4 M30 12 v-6" />
          <path d="M26 30 q4 6 8 0" />
        </g>
      </svg>
      <svg className="board__deco" style={{ left: '2%', bottom: '6%', width: '17%' }} viewBox="0 0 70 70" aria-hidden="true">
        <path d="M35 66 Q34 50 35 38" stroke="var(--slate)" strokeWidth="3" fill="none" />
        <g fill="#fbf6e6">{Array.from({ length: 7 }, (_, i) => <ellipse key={i} cx="35" cy="14" rx="7" ry="11" transform={`rotate(${i * 51} 35 28)`} />)}</g>
        <circle cx="35" cy="28" r="9" fill="var(--yellow)" />
      </svg>
      <svg className="board__deco" style={{ left: '20%', bottom: '5%', width: '16%' }} viewBox="0 0 70 70" aria-hidden="true">
        <g fill="var(--sage)">
          <ellipse cx="22" cy="30" rx="18" ry="7" transform="rotate(-35 22 30)" />
          <ellipse cx="46" cy="24" rx="17" ry="6.5" transform="rotate(30 46 24)" />
          <ellipse cx="24" cy="48" rx="17" ry="6.5" transform="rotate(-20 24 48)" />
          <ellipse cx="46" cy="44" rx="16" ry="6" transform="rotate(25 46 44)" />
        </g>
        <path d="M34 68 Q33 40 36 14" stroke="var(--slate)" strokeWidth="2.4" fill="none" />
      </svg>
      <svg className="board__deco" style={{ right: '2%', bottom: '5%', width: '12%' }} viewBox="0 0 70 80" aria-hidden="true">
        <path d="M35 78 Q34 60 35 44" stroke="var(--slate)" strokeWidth="3" fill="none" />
        <ellipse cx="18" cy="64" rx="14" ry="6" fill="var(--sage)" transform="rotate(-30 18 64)" />
        <ellipse cx="53" cy="60" rx="14" ry="6" fill="var(--sage)" transform="rotate(30 53 60)" />
        <g fill="#fbf6e6">{Array.from({ length: 7 }, (_, i) => <ellipse key={i} cx="35" cy="14" rx="7" ry="11" transform={`rotate(${i * 51} 35 28)`} />)}</g>
        <circle cx="35" cy="28" r="9" fill="var(--yellow)" />
      </svg>
    </>
  );
}

function Bush({ x, y, s = 1, flowers = [] as [number, number][] }: { x: number; y: number; s?: number; flowers?: [number, number][] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill="var(--bush)">
        <circle cx="-26" cy="-14" r="22" />
        <circle cx="0" cy="-26" r="28" />
        <circle cx="28" cy="-14" r="22" />
        <rect x="-48" y="-14" width="96" height="14" rx="4" />
      </g>
      <path d="M-34 -4 q14 -18 30 -2 M6 -8 q14 -22 32 -4" stroke="#5a8a47" strokeWidth="4" fill="none" strokeLinecap="round" />
      {flowers.map(([fx, fy], i) => (
        <g key={i} transform={`translate(${fx} ${fy})`}>
          <g fill="#fbf6e6">{Array.from({ length: 6 }, (_, k) => <ellipse key={k} cx="0" cy="-4.4" rx="2.6" ry="4.2" transform={`rotate(${k * 60})`} />)}</g>
          <circle r="2.6" fill="#f6a21e" />
        </g>
      ))}
    </g>
  );
}

/** The skyline on the horizon: house (left), clock tower (centre), shop (right). Drawn from design/homepage.png. */
export function Town() {
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  const stripes = Array.from({ length: 6 }, (_, i) => i);
  return (
    <svg viewBox="0 0 441 330" style={{ position: 'absolute', left: 0, bottom: 'calc(100% - var(--horizon))', width: '100%', display: 'block' }} aria-hidden="true">
      <rect x="0" y="254" width="441" height="76" fill="var(--hill)" />
      {/* distant buildings */}
      <rect x="256" y="296" width="52" height="34" fill="#e0c19a" />
      <rect x="256" y="292" width="52" height="5" fill="#8a5a3a" />
      <rect x="298" y="264" width="40" height="66" fill="#e9cfaa" />
      <rect x="298" y="262" width="40" height="5" fill="#cfae88" />
      <rect x="316" y="284" width="12" height="9" rx="2" fill="#b98f65" />
      {/* house */}
      <rect x="0" y="252" width="98" height="78" fill="#fae5b5" />
      <polygon points="-36,264 43,198 112,256 104,266 -36,266" fill="var(--roof-red)" />
      <circle cx="43" cy="252" r="10" fill="#ee8844" />
      <circle cx="43" cy="252" r="6.4" fill="#8bbde8" />
      <rect x="6" y="282" width="31" height="48" rx="3" fill="#ee8844" />
      <rect x="46" y="284" width="50" height="42" rx="3" fill="#ee8844" />
      <rect x="51" y="289" width="40" height="32" rx="2" fill="#8bbde8" />
      <rect x="51" y="289" width="40" height="11" fill="#f6b266" />
      {/* clock tower */}
      <polygon points="213,22 246,88 180,88" fill="var(--spire)" />
      <circle cx="213" cy="20" r="3.6" fill="var(--spire)" />
      <rect x="168" y="88" width="90" height="24" fill="var(--tower-top)" />
      {[168, 182, 196, 210, 224, 238].map((x) => <rect key={x} x={x} y="84" width="10" height="6" fill="var(--tower-top)" />)}
      <rect x="173" y="112" width="80" height="218" fill="var(--tower)" />
      <rect x="168" y="176" width="90" height="7" fill="var(--tower-top)" />
      <circle cx="213" cy="144" r="30" fill="#fbf8f0" stroke="#1f3447" strokeWidth="3.4" />
      {ticks.map((i) => (
        <line key={i} x1="213" y1="118" x2="213" y2={i % 3 === 0 ? 124 : 121} stroke="#1f3447" strokeWidth="2" transform={`rotate(${i * 30} 213 144)`} />
      ))}
      <line x1="213" y1="144" x2="213" y2="124" stroke="#1f3447" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="213" y1="144" x2="232" y2="150" stroke="#1f3447" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="213" cy="144" r="3" fill="#1f3447" />
      {[188, 208, 228].map((x) => (
        <g key={x}>
        <rect x={x} y="196" width="10" height="52" rx="5" fill="var(--tower-dark)" />
        <rect x={x} y="206" width="10" height="42" fill="var(--tower-dark)" />
        </g>
      ))}
      <rect x="187" y="254" width="52" height="2" fill="var(--tower-dark)" opacity=".6" />
      <path d="M201 330 v-26 a12 12 0 0 1 24 0 v26 z" fill="#6b4538" />
      {/* bushes */}
      <Bush x={40} y={332} s={0.62} flowers={[[-18, -26], [6, -34], [26, -22]]} />
      <Bush x={142} y={332} s={1} flowers={[[-22, -20], [4, -42], [26, -28], [-4, -12]]} />
      <Bush x={330} y={332} s={0.9} flowers={[[-20, -22], [6, -40], [28, -26]]} />
      {/* shop */}
      <rect x="346" y="278" width="100" height="52" fill="#f2a21e" />
      <rect x="352" y="206" width="100" height="34" rx="4" fill="var(--cloud)" stroke="#68afa3" strokeWidth="5" />
      <text x="402" y="232" textAnchor="middle" fontFamily="Nunito Sans, sans-serif" fontWeight="900" fontSize="22" letterSpacing="1.5" fill="#1f3447">SHOP</text>
      <g>
        {stripes.map((i) => (
          <rect key={i} x={340 + i * 21} y="240" width="21" height="36" fill={i % 2 === 0 ? '#f5532b' : '#f5e5d6'} />
        ))}
        {stripes.map((i) => (
          <circle key={i} cx={350.5 + i * 21} cy="276" r="10.5" fill={i % 2 === 0 ? '#f5532b' : '#f5e5d6'} />
        ))}
      </g>
      <rect x="356" y="290" width="58" height="34" rx="3" fill="#1f3447" stroke="#f3e7d3" strokeWidth="3" />
      <path d="M370 316 l16 -20 M380 316 l16 -20" stroke="#f3e7d3" strokeWidth="1.6" opacity=".7" />
      <rect x="424" y="286" width="24" height="44" fill="#68afa3" />
    </svg>
  );
}

export function PodiumIllustration() {
  return (
    <svg viewBox="0 0 260 230" width="100%" style={{ maxWidth: 235 }} aria-hidden="true">
      <ellipse cx="130" cy="186" rx="116" ry="30" fill="var(--htp-moss)" stroke="var(--bark)" strokeWidth="4" />
      <rect x="86" y="110" width="88" height="70" fill="#c98a4b" stroke="var(--bark)" strokeWidth="4" />
      <rect x="140" y="112" width="30" height="66" fill="#8a5a33" />
      <rect x="72" y="96" width="116" height="18" fill="#a9703a" stroke="var(--bark)" strokeWidth="4" />
      <path d="M118 130 q14 -4 18 18 q-16 6 -18 -18z" fill="#b6d0a8" stroke="var(--bark)" strokeWidth="3" />
      <g transform="translate(0 26)">
        <path d="M92 52 L100 22 L118 42 L130 16 L142 42 L160 22 L168 52 Z" fill="var(--htp-amber)" stroke="var(--bark)" strokeWidth="4" strokeLinejoin="round" />
        <rect x="92" y="50" width="76" height="14" rx="3" fill="var(--htp-amber)" stroke="var(--bark)" strokeWidth="4" />
        <path d="M130 30 l4 6 -4 6 -4 -6z" fill="#fff" />
      </g>
      <g transform="rotate(-8 56 168)"><rect x="34" y="146" width="44" height="44" rx="3" fill="#fff" stroke="var(--bark)" strokeWidth="3" /><path d="M44 168 l9 9 l15 -17" stroke="var(--htp-moss)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
      <g transform="rotate(10 196 176)"><rect x="170" y="154" width="44" height="40" rx="3" fill="#fff" stroke="var(--bark)" strokeWidth="3" /><path d="M180 176 l9 9 l15 -17" stroke="var(--htp-moss)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
      <circle cx="226" cy="182" r="17" fill="var(--red)" stroke="var(--bark)" strokeWidth="4" />
      <path d="M226 165 q-2 -9 6 -10 M218 168 q8 -4 14 0" stroke="var(--htp-moss)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M218 178 q2 -5 7 -6" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8" />
    </svg>
  );
}
