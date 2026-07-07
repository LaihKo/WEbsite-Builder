export function CountdownRing({
  seconds,
  max,
  size = 110,
}: {
  seconds: number | null;
  max: number;
  size?: number;
}) {
  const s = seconds ?? 0;
  const CIRC = 251.327; // 2π·40
  const frac = Math.max(0, Math.min(1, s / max));
  const color = frac > 0.5 ? "var(--accent-2)" : frac > 0.25 ? "var(--accent)" : "var(--danger)";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 96" width={size} height={size}>
        <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke .4s" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono font-bold tabular-nums text-[34px] leading-none text-foreground">{s}</span>
        <span className="text-[11px] tracking-widest text-faint">SEK</span>
      </div>
    </div>
  );
}
