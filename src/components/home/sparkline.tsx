/** Tiny server-rendered SVG sparkline (e.g. SGPA per semester). */
export function Sparkline({ values, min = 6, max = 10, label }: { values: number[]; min?: number; max?: number; label: string }) {
  const w = 120;
  const h = 32;
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, h - ((v - min) / (max - min)) * (h - 4) - 2] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`-2 -2 ${w + 4} ${h + 4}`} className="h-8 w-[7.5rem] overflow-visible" role="img" aria-label={label}>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="var(--signal-glow)" opacity="0.35" />
      <path d={d} fill="none" stroke="var(--signal-soft)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 2.6 : 1.6} fill={i === pts.length - 1 ? "var(--signal-pale)" : "var(--signal)"} />
      ))}
    </svg>
  );
}
