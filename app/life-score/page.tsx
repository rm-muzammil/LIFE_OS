"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── types ───────────────────────────────────────────────────────────────────
interface DimDetail {
  score: number;
  weight: number;
  mock?: boolean;
}
interface LifeScoreData {
  dimensions: {
    faith: DimDetail;
    knowledge: DimDetail & { raw?: Record<string, unknown> };
    health: DimDetail & { raw?: Record<string, unknown> };
    character: DimDetail;
    mission: DimDetail;
  };
  total: number;
  weekStart: string;
  history: Array<{
    weekStart: string;
    faith: number;
    knowledge: number;
    health: number;
    character: number;
    mission: number;
    total: number;
  }>;
}

// ─── dimension meta ───────────────────────────────────────────────────────────
const DIM_META = {
  faith: {
    label: "Faith",
    color: "#22c55e",
    icon: "☽",
    description: "5 Pillars · Quran · Dhikr",
  },
  knowledge: {
    label: "Knowledge",
    color: "#60a5fa",
    icon: "📖",
    description: "German Roadmap learning",
  },
  health: {
    label: "Health",
    color: "#f97316",
    icon: "🏃",
    description: "Exercise · Sleep · Tasks",
  },
  character: {
    label: "Character",
    color: "#a78bfa",
    icon: "⚖",
    description: "5 virtues weekly average",
  },
  mission: {
    label: "Mission",
    color: "#fbbf24",
    icon: "🎯",
    description: "Weekly mission alignment",
  },
} as const;
type DimKey = keyof typeof DIM_META;

// ─── score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#22c55e"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset="0"
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text
        x="70"
        y="66"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#f4f4f5"
        fontSize="26"
        fontWeight="700"
        fontFamily="var(--font-sans, sans-serif)"
      >
        {Math.round(score)}
      </text>
      <text
        x="70"
        y="88"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#71717a"
        fontSize="11"
        fontFamily="var(--font-sans, sans-serif)"
      >
        / 100
      </text>
    </svg>
  );
}

// ─── dimension card ───────────────────────────────────────────────────────────
function DimCard({
  dimKey,
  detail,
}: {
  dimKey: DimKey;
  detail: DimDetail & { raw?: Record<string, unknown> };
}) {
  const meta = DIM_META[dimKey];
  const pct = Math.round(detail.score);
  const barColor = meta.color;

  return (
    <div className="dim-card">
      <div className="dim-card-header">
        <span className="dim-icon">{meta.icon}</span>
        <div>
          <p className="dim-label">{meta.label}</p>
          <p className="dim-desc">{meta.description}</p>
        </div>
        <span className="dim-weight">{Math.round(detail.weight * 100)}%</span>
      </div>
      <div className="dim-bar-track">
        <div
          className="dim-bar-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="dim-score-row">
        <span className="dim-score-num" style={{ color: barColor }}>
          {pct}
        </span>
        {detail.mock && (
          <span className="dim-mock-badge">
            mock · connect in settings
          </span>
        )}
      </div>
    </div>
  );
}

// ─── custom tooltip for recharts ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload)) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label as string}</p>
      {(payload as Array<{ name: string; value: number; color: string }>).map(
        (p) => (
          <p key={p.name} style={{ color: p.color }}>
            {DIM_META[p.name as DimKey]?.label ?? p.name}: {p.value}
          </p>
        )
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function LifeScorePage() {
  const [data, setData] = useState<LifeScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/life-score")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="ls-loading">
        <div className="ls-spinner" />
        <p>Computing life score…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ls-loading">
        <p style={{ color: "#ef4444" }}>Failed to load life score.</p>
      </div>
    );
  }

  const dims = Object.entries(data.dimensions) as Array<
    [DimKey, DimDetail & { raw?: Record<string, unknown> }]
  >;

  const chartData = data.history.map((h) => ({
    week: h.weekStart.slice(5),       // "MM-DD"
    faith: h.faith,
    knowledge: h.knowledge,
    health: h.health,
    character: h.character,
    mission: h.mission,
    total: h.total,
  }));

  return (
    <>
      <style>{styles}</style>
      <div className="ls-page">
        {/* header */}
        <div className="ls-header">
          <h1 className="ls-title">Life Score</h1>
          <p className="ls-subtitle">Week of {data.weekStart}</p>
        </div>

        {/* total score ring */}
        <div className="ls-ring-wrapper">
          <ScoreRing score={data.total} />
          <p className="ls-ring-label">Overall</p>
        </div>

        {/* dimension cards */}
        <section className="ls-cards">
          {dims.map(([key, detail]) => (
            <DimCard key={key} dimKey={key} detail={detail} />
          ))}
        </section>

        {/* history chart */}
        {chartData.length > 1 && (
          <section className="ls-chart-section">
            <h2 className="ls-section-title">12-week trend</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
                  formatter={(v: string) =>
                    DIM_META[v as DimKey]?.label ?? v
                  }
                />
                {(Object.keys(DIM_META) as DimKey[]).map((k) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={DIM_META[k].color}
                    strokeWidth={k === "faith" ? 2.5 : 1.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        )}
      </div>
    </>
  );
}

// ─── scoped styles ────────────────────────────────────────────────────────────
const styles = `
.ls-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 60vh; gap: 12px; color: #71717a;
}
.ls-spinner {
  width: 32px; height: 32px; border: 3px solid #27272a;
  border-top-color: #22c55e; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.ls-page {
  max-width: 640px; margin: 0 auto;
  padding: 24px 16px 80px;
  color: #f4f4f5;
  font-family: var(--font-sans, sans-serif);
}

.ls-header { margin-bottom: 8px; }
.ls-title { font-size: 22px; font-weight: 700; margin: 0; }
.ls-subtitle { font-size: 13px; color: #71717a; margin: 4px 0 0; }

.ls-ring-wrapper {
  display: flex; flex-direction: column; align-items: center;
  margin: 20px 0;
}
.ls-ring-label {
  font-size: 12px; color: #71717a; margin: 4px 0 0; text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ls-cards {
  display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px;
}
.dim-card {
  background: #18181b; border: 1px solid #27272a;
  border-radius: 12px; padding: 14px 16px;
}
.dim-card-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.dim-icon { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0; }
.dim-label { font-size: 14px; font-weight: 600; margin: 0; color: #f4f4f5; }
.dim-desc { font-size: 11px; color: #71717a; margin: 2px 0 0; }
.dim-weight {
  margin-left: auto; font-size: 11px; color: #52525b;
  background: #27272a; padding: 2px 7px; border-radius: 999px;
}
.dim-bar-track {
  height: 6px; background: #27272a; border-radius: 999px; overflow: hidden;
}
.dim-bar-fill {
  height: 100%; border-radius: 999px;
  transition: width 0.7s cubic-bezier(.4,0,.2,1);
}
.dim-score-row {
  display: flex; align-items: baseline; gap: 8px; margin-top: 6px;
}
.dim-score-num { font-size: 20px; font-weight: 700; }
.dim-mock-badge {
  font-size: 10px; color: #71717a; background: #27272a;
  padding: 2px 8px; border-radius: 999px;
}

.ls-section-title {
  font-size: 14px; font-weight: 600; color: #a1a1aa;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin: 0 0 12px;
}
.ls-chart-section { margin-bottom: 24px; }

.chart-tooltip {
  background: #18181b; border: 1px solid #27272a;
  border-radius: 8px; padding: 10px 14px;
  font-size: 12px; color: #a1a1aa;
}
.tooltip-label { font-weight: 600; color: #f4f4f5; margin: 0 0 4px; }
`;