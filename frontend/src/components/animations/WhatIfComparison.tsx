import type { Scenario } from "../../workflow/events";
import { OUTPUT_COLORS } from "./motion";
import { AnimatedCounter } from "./AnimatedCounter";

const OUTPUTS = [
  ["oil_pct", "Oil"],
  ["gas_pct", "Gas"],
  ["char_pct", "Char"],
  ["other_product_pct", "Other"],
] as const;

function Value({ value }: { value: number | undefined }) {
  return <AnimatedCounter value={value} decimals={1} suffix="%" />;
}

function Side({
  title,
  values,
  params,
  tone,
}: {
  title: string;
  values: Record<string, number>;
  params: Array<{ label: string; value: string }>;
  tone: "current" | "whatif";
}) {
  const isWhatIf = tone === "whatif";
  return (
    <section
      className={`whatif-side is-${tone} rounded-lg p-3.5 transition-all duration-300 ${
        isWhatIf
          ? "border border-cyan-500/30 bg-cyan-950/20"
          : "border border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted">
          {title}
        </p>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            isWhatIf ? "bg-cyan-400 animate-pulse" : "bg-emerald-400"
          }`}
        />
      </div>

      <ul className="mt-2.5 space-y-1 text-sm">
        {params.map((param) => (
          <li key={param.label} className="flex justify-between text-xs">
            <span className="text-zinc-400">{param.label}</span>
            <span className="tabular font-medium text-zinc-100">{param.value}</span>
          </li>
        ))}
      </ul>

      <ul className="mt-3.5 space-y-2.5">
        {OUTPUTS.map(([key, label]) => {
          const val = values[key] ?? 0;
          const color = OUTPUT_COLORS[key] ?? "#059669";
          return (
            <li
              key={key}
              className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-2.5 text-sm"
            >
              <span className="text-xs font-medium text-zinc-300">{label}</span>
              {/* Fluid Liquid-Fill Bar with Continuous Animated Shimmer Flow */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="liquid-bar-fill block h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, val))}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}66`,
                  }}
                />
              </div>
              <Value value={values[key]} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WhatIfComparison({
  scenario,
  running,
}: {
  scenario: Scenario | null;
  running: boolean;
}) {
  if (!scenario) {
    return (
      <p className="text-sm text-muted">
        Move a slider. The comparison appears after the model returns the new prediction.
      </p>
    );
  }
  const params = scenario.changes;
  const deltas = OUTPUTS.map(([key, label]) => {
    const before = scenario.before[key];
    const after = scenario.after[key];
    const delta = before !== undefined && after !== undefined ? after - before : null;
    return { key, label, delta };
  });

  return (
    <figure
      className={
        running
          ? "opacity-70 transition-opacity duration-300"
          : "transition-opacity duration-300"
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Side
          title="Current Base"
          tone="current"
          values={scenario.before}
          params={params.map((change) => ({
            label: change.label,
            value: `${change.from.toFixed(1)} ${change.unit}`,
          }))}
        />
        <Side
          title="Simulated What-If"
          tone="whatif"
          values={scenario.after}
          params={params.map((change) => ({
            label: change.label,
            value: `${change.to.toFixed(1)} ${change.unit}`,
          }))}
        />
      </div>

      <ul
        className="mt-3.5 flex flex-wrap gap-2 text-sm"
        aria-label="Change in predicted outputs"
      >
        {deltas.map((item) =>
          item.delta === null ? null : (
            <li
              key={item.key}
              className={`delta-chip flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-transform ${
                Math.abs(item.delta) < 0.05
                  ? "border border-zinc-700 bg-zinc-800/60 text-zinc-300"
                  : item.delta > 0
                  ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                  : "border border-rose-500/40 bg-rose-950/40 text-rose-300 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
              }`}
            >
              <span>{Math.abs(item.delta) < 0.05 ? "→" : item.delta > 0 ? "↑" : "↓"}</span>
              <span>{item.label}</span>
              <AnimatedCounter
                value={item.delta}
                decimals={2}
                prefix={item.delta > 0 ? "+" : ""}
                suffix=" pp"
              />
            </li>
          )
        )}
      </ul>
      <figcaption className="mt-2 text-xs text-muted">
        {params.length ? "" : "No input differs from the current sample. "}Both sides are
        model estimates from the same model. Arrows follow the returned values.
      </figcaption>
    </figure>
  );
}
