import type { Optimization } from "../../types";
import { FEATURE_LABELS, useStagger } from "./motion";

type Range = { min: number; max: number; unit: string; label: string };

const KEYS = ["temperature_c", "residence_time_min", "particle_size_mm", "feed_rate_kg_h"] as const;

function position(value: number | null | undefined, range: Range): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || range.max === range.min) return null;
  return Math.max(0, Math.min(100, ((value - range.min) / (range.max - range.min)) * 100));
}

export function OptimizationAnimation({
  ranges,
  optimization,
  running,
}: {
  ranges: Record<string, Range> | undefined;
  optimization: Optimization | null | undefined;
  running: boolean;
}) {
  const top = optimization?.available ? (optimization.top ?? []) : [];
  const shown = useStagger(top.length, 380, !running && top.length > 0);
  const revealed = !running && shown >= top.length && top.length > 0;
  const best = optimization?.best?.configuration;
  const current = optimization?.current?.configuration;
  if (!ranges) return <p className="text-sm">The optimization boundary is still loading.</p>;
  const temp = ranges.temperature_c;
  const time = ranges.residence_time_min;
  return (
    <figure>
      <p className="mb-3 inline-block border border-line px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">
        Model search within observed training-data ranges
      </p>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {KEYS.map((key) => {
            const range = ranges[key];
            if (!range) return null;
            const bestAt = position(best?.[key], range);
            const currentAt = position(current?.[key] ?? null, range);
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-muted">
                  <span>{range.label}</span>
                  <span className="tabular">
                    {range.min} – {range.max} {range.unit}
                  </span>
                </div>
                <div className={`search-track ${running ? "is-searching" : ""}`}>
                  {running ? <span className="search-sweep" aria-hidden /> : null}
                  {!running
                    ? top.slice(0, shown).map((candidate, index) => {
                        const at = position(candidate.configuration[key], range);
                        return at === null ? null : <span key={index} className="search-dot" style={{ left: `${at}%` }} aria-hidden />;
                      })
                    : null}
                  {currentAt !== null ? <span className="search-current" style={{ left: `${currentAt}%` }} title="Current" aria-hidden /> : null}
                  {revealed && bestAt !== null ? <span className="search-best" style={{ left: `${bestAt}%` }} aria-hidden /> : null}
                </div>
                {revealed && best ? (
                  <p className="mt-1 text-xs">
                    Best: <span className="tabular font-medium">{best[key]?.toFixed(2)} {range.unit}</span>
                    {current?.[key] !== null && current?.[key] !== undefined ? <span className="text-muted"> · current {Number(current[key]).toFixed(2)}</span> : null}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div>
          {temp && time ? (
            <svg viewBox="0 0 220 160" className="search-plane" role="img" aria-label="Temperature against residence time, with the returned candidates">
              <rect x="30" y="10" width="180" height="120" className="search-plane-bg" />
              <text x="120" y="152" textAnchor="middle" className="search-axis">
                {FEATURE_LABELS.temperature_c} {temp.min}–{temp.max} {temp.unit}
              </text>
              <text x="12" y="70" textAnchor="middle" className="search-axis" transform="rotate(-90 12 70)">
                {FEATURE_LABELS.residence_time_min} {time.min}–{time.max}
              </text>
              {running ? <rect x="30" y="10" width="18" height="120" className="search-plane-sweep" /> : null}
              {!running
                ? top.slice(0, shown).map((candidate, index) => {
                    const x = position(candidate.configuration.temperature_c, temp);
                    const y = position(candidate.configuration.residence_time_min, time);
                    if (x === null || y === null) return null;
                    return <circle key={index} cx={30 + (x / 100) * 180} cy={130 - (y / 100) * 120} r={index === 0 && revealed ? 6 : 4} className={index === 0 && revealed ? "search-plane-best" : "search-plane-dot"} />;
                  })
                : null}
              {(() => {
                const x = position(current?.temperature_c ?? null, temp);
                const y = position(current?.residence_time_min ?? null, time);
                return x !== null && y !== null ? <rect x={30 + (x / 100) * 180 - 4} y={130 - (y / 100) * 120 - 4} width="8" height="8" className="search-plane-current" /> : null;
              })()}
            </svg>
          ) : null}
          <ol className="mt-2 space-y-1 text-sm" aria-live="polite">
            {running ? <li className="text-muted">Searching the grid inside the training range…</li> : null}
            {!running
              ? top.slice(0, shown).map((candidate, index) => (
                  <li key={index} className={`flex justify-between border-l-2 pl-2 fade-up ${index === 0 && revealed ? "border-copper font-medium" : "border-line"}`}>
                    <span>Candidate {String(index + 1).padStart(2, "0")}</span>
                    <span className="tabular">
                      {candidate.score.toFixed(2)} {optimization?.best?.score_unit ?? ""}
                    </span>
                  </li>
                ))
              : null}
          </ol>
          {optimization?.available && !running ? (
            <p className="mt-2 text-xs text-muted">
              Top {top.length} of {optimization.evaluated} evaluated configurations. Score: {optimization.proxy}. These are model evaluations, not physical experiments.
            </p>
          ) : null}
          {optimization && !optimization.available && !running ? <p className="mt-2 text-sm">{optimization.reason}</p> : null}
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-muted">Square marks the current configuration. Dots are the top returned candidates. The ring marks the best.</figcaption>
    </figure>
  );
}
