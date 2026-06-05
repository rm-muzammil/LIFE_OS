"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StripData {
  dimensions: {
    faith: { score: number };
    knowledge: { score: number };
    health: { score: number };
    character: { score: number };
    mission: { score: number };
  };
  total: number;
}

const DIMS = [
  { key: "faith",     label: "Faith",     color: "#22c55e", icon: "☽"  },
  { key: "knowledge", label: "Know",      color: "#60a5fa", icon: "📖" },
  { key: "health",    label: "Health",    color: "#f97316", icon: "🏃" },
  { key: "character", label: "Char",      color: "#a78bfa", icon: "⚖"  },
  { key: "mission",   label: "Mission",   color: "#fbbf24", icon: "🎯" },
] as const;

export default function LifeScoreStrip() {
  const [data, setData] = useState<StripData | null>(null);

  useEffect(() => {
    fetch("/api/life-score")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <Link href="/life-score" style={{ textDecoration: "none" }}>
      <div className="lss-strip">
        {/* total pill */}
        <div className="lss-total">
          <span className="lss-total-num">
            {data ? Math.round(data.total) : "—"}
          </span>
          <span className="lss-total-label">Life</span>
        </div>

        <div className="lss-divider" />

        {/* individual scores */}
        <div className="lss-dims">
          {DIMS.map(({ key, label, color, icon }) => {
            const score = data
              ? Math.round(data.dimensions[key].score)
              : null;
            const pct = score ?? 0;
            return (
              <div key={key} className="lss-dim">
                <div className="lss-dim-bar-track">
                  <div
                    className="lss-dim-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="lss-dim-icon" aria-hidden>
                  {icon}
                </span>
                <span className="lss-dim-label">{label}</span>
                <span className="lss-dim-score" style={{ color }}>
                  {score ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .lss-strip {
          display: flex; align-items: center; gap: 12px;
          background: #18181b; border: 1px solid #27272a;
          border-radius: 12px; padding: 10px 14px;
          cursor: pointer; transition: border-color 0.15s;
        }
        .lss-strip:hover { border-color: #3f3f46; }

        .lss-total {
          display: flex; flex-direction: column; align-items: center;
          flex-shrink: 0; min-width: 42px;
        }
        .lss-total-num {
          font-size: 22px; font-weight: 700; color: #22c55e;
          line-height: 1;
        }
        .lss-total-label {
          font-size: 10px; color: #52525b; text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .lss-divider {
          width: 1px; height: 36px; background: #27272a; flex-shrink: 0;
        }

        .lss-dims {
          display: flex; flex: 1; gap: 8px;
          flex-wrap: wrap;
        }

        .lss-dim {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; flex: 1; min-width: 44px;
        }

        .lss-dim-bar-track {
          width: 100%; height: 3px; background: #27272a;
          border-radius: 999px; overflow: hidden;
        }
        .lss-dim-bar-fill {
          height: 100%; border-radius: 999px;
          transition: width 0.6s cubic-bezier(.4,0,.2,1);
        }

        .lss-dim-icon { font-size: 13px; line-height: 1; }
        .lss-dim-label {
          font-size: 9px; color: #71717a; text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .lss-dim-score { font-size: 13px; font-weight: 600; line-height: 1; }
      `}</style>
    </Link>
  );
}