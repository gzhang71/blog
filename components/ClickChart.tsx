"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Series } from "@/lib/clicks";

/** Colorblind-safe categorical ramp; readable on both themes. */
const COLORS = ["#e07a3f", "#3b82c4", "#4c9a6b", "#9b6bc4", "#c4526b", "#8a8378"];

const W = 720;
const H = 240;
const PAD = { top: 16, right: 14, bottom: 26, left: 36 };

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
];

type StatsResponse = { days: string[]; series: Series[] };

export default function ClickChart() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`/api/stats?days=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: StatsResponse) => !cancelled && setData(json))
      .catch(() => !cancelled && setError("Could not load click data."));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const visible = useMemo(
    () => (data?.series ?? []).filter((s) => !hidden.has(s.target)),
    [data, hidden],
  );

  const max = useMemo(() => {
    const peak = Math.max(
      1,
      ...visible.flatMap((s) => s.points.map((p) => p.count)),
    );
    // Round up to something that makes a tidy axis.
    const step = Math.pow(10, Math.floor(Math.log10(peak)));
    return Math.ceil(peak / step) * step;
  }, [visible]);

  const days = data?.days ?? [];
  const x = (i: number) =>
    PAD.left +
    (days.length <= 1
      ? 0
      : (i / (days.length - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) =>
    H - PAD.bottom - (v / max) * (H - PAD.top - PAD.bottom);

  function toggle(target: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(target) ? next.delete(target) : next.add(target);
      return next;
    });
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || days.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = (px - PAD.left) / (W - PAD.left - PAD.right);
    const i = Math.round(ratio * (days.length - 1));
    setCursor(Math.min(days.length - 1, Math.max(0, i)));
  }

  const totals = (data?.series ?? []).reduce((sum, s) => sum + s.total, 0);
  const windowTotal = (data?.series ?? []).reduce(
    (sum, s) => sum + s.points.reduce((a, p) => a + p.count, 0),
    0,
  );

  return (
    <div>
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="k">All-time clicks</div>
          <div className="v">{data ? totals.toLocaleString() : "—"}</div>
          <div className="d">across {data?.series.length ?? 0} links</div>
        </div>
        <div className="stat-tile">
          <div className="k">Last {range} days</div>
          <div className="v">{data ? windowTotal.toLocaleString() : "—"}</div>
          <div className="d">
            {data ? (windowTotal / range).toFixed(1) : "—"} / day avg
          </div>
        </div>
        {(data?.series ?? [])
          .slice()
          .sort((a, b) => b.total - a.total)
          .slice(0, 2)
          .map((s) => (
            <div className="stat-tile" key={s.target}>
              <div className="k">{s.target}</div>
              <div className="v">{s.total.toLocaleString()}</div>
              <div className="d">
                {s.points.reduce((a, p) => a + p.count, 0)} in window
              </div>
            </div>
          ))}
      </div>

      <div className="section-head" style={{ marginBottom: 14 }}>
        <span className="eyebrow">clicks per day</span>
        <div className="range-tabs">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              className="range-tab"
              aria-pressed={range === r.days}
              onClick={() => setRange(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-card">
        {error ? (
          <div className="empty">{error}</div>
        ) : !data ? (
          <div className="empty">Loading…</div>
        ) : data.series.length === 0 ? (
          <div className="empty">
            No clicks recorded yet. Every outbound link on this site reports to
            <code> /api/track</code> — the first click starts the series.
          </div>
        ) : (
          <>
            <div className="chart-legend">
              {data.series.map((s, i) => (
                <button
                  key={s.target}
                  type="button"
                  className="legend-item"
                  data-off={hidden.has(s.target)}
                  onClick={() => toggle(s.target)}
                >
                  <span
                    className="legend-swatch"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {s.target}
                </button>
              ))}
            </div>

            <div className="chart-scroll">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                role="img"
                aria-label="Outbound link clicks per day"
                onMouseMove={onMove}
                onMouseLeave={() => setCursor(null)}
                style={{ display: "block", minWidth: 420 }}
              >
                {[0, 0.5, 1].map((t) => (
                  <g key={t}>
                    <line
                      x1={PAD.left}
                      x2={W - PAD.right}
                      y1={y(max * t)}
                      y2={y(max * t)}
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD.left - 8}
                      y={y(max * t) + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="var(--mono)"
                      fill="var(--text-faint)"
                    >
                      {Math.round(max * t)}
                    </text>
                  </g>
                ))}

                {days.map((d, i) =>
                  i % Math.ceil(days.length / 6) === 0 ? (
                    <text
                      key={d}
                      x={x(i)}
                      y={H - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="var(--mono)"
                      fill="var(--text-faint)"
                    >
                      {d.slice(5)}
                    </text>
                  ) : null,
                )}

                {cursor !== null && (
                  <line
                    x1={x(cursor)}
                    x2={x(cursor)}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke="var(--border-strong)"
                    strokeDasharray="3 3"
                  />
                )}

                {data.series.map((s, i) => {
                  if (hidden.has(s.target)) return null;
                  const color = COLORS[i % COLORS.length];
                  const path = s.points
                    .map((p, j) => `${j === 0 ? "M" : "L"}${x(j)},${y(p.count)}`)
                    .join(" ");
                  const area = `${path} L${x(s.points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
                  return (
                    <g key={s.target}>
                      <path d={area} fill={color} opacity="0.07" />
                      <path
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {cursor !== null && (
                        <circle
                          cx={x(cursor)}
                          cy={y(s.points[cursor]?.count ?? 0)}
                          r="3.5"
                          fill="var(--bg-raised)"
                          stroke={color}
                          strokeWidth="2"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {cursor !== null && (
              <div
                className="mono"
                style={{ fontSize: 12, marginTop: 10, color: "var(--text-muted)" }}
              >
                <strong style={{ color: "var(--text)" }}>{days[cursor]}</strong>
                {"  "}
                {visible
                  .map((s) => `${s.target} ${s.points[cursor]?.count ?? 0}`)
                  .join("  ·  ")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
