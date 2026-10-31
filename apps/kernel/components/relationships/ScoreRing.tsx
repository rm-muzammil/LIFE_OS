export type RingItem = {
  key: string;
  points: number;
  done: boolean;
};

type Props = {
  items: RingItem[];
  weeklyBonusEarned: boolean;
  totalScore: number;
  streak: number;
  size?: number;
};

const GAP_DEG = 6;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function describeArc(cx: number, cy: number, radius: number, start: number, end: number) {
  const first = polarToCartesian(cx, cy, radius, start);
  const last = polarToCartesian(cx, cy, radius, end);
  const largeArcFlag = end - start <= 180 ? '0' : '1';
  return `M ${first.x} ${first.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${last.x} ${last.y}`;
}

export default function ScoreRing({ items, weeklyBonusEarned, totalScore, streak, size = 240 }: Props) {
  const center = size / 2;
  const innerRadius = size * 0.36;
  const outerRadius = size * 0.44;
  const basePoints = items.reduce((sum, item) => sum + item.points, 0);
  const availableDegrees = 360 - GAP_DEG * items.length;
  let cursor = 0;
  const arcs = items.map((item) => {
    const sweep = (item.points / basePoints) * availableDegrees;
    const path = describeArc(center, center, innerRadius, cursor, cursor + sweep);
    cursor += sweep + GAP_DEG;
    return { ...item, path };
  });

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          className="text-zinc-800"
          strokeWidth={size * 0.052}
        />
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="currentColor"
          className="text-zinc-900"
          strokeWidth={size * 0.02}
          strokeDasharray="1 6"
          strokeLinecap="round"
        />
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arc.path}
            fill="none"
            stroke="currentColor"
            className={arc.done ? 'text-brand-400' : 'text-zinc-700'}
            strokeWidth={size * 0.052}
            strokeLinecap="round"
          />
        ))}
        {weeklyBonusEarned && (
          <path
            d={describeArc(center, center, outerRadius, 0, 360 * 0.92)}
            fill="none"
            stroke="currentColor"
            className="text-brand-300"
            strokeWidth={size * 0.02}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tabular-nums text-zinc-50">{totalScore}</span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">of 100</span>
        {streak > 0 && (
          <span className="mt-2 rounded-full bg-brand-950 px-2.5 py-0.5 text-xs font-medium text-brand-300">
            {streak} day{streak === 1 ? '' : 's'} streak
          </span>
        )}
        {weeklyBonusEarned && <span className="mt-1 text-[10px] font-medium text-brand-400/80">+15 weekly reflection</span>}
      </div>
    </div>
  );
}
