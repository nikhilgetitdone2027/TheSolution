import type { Scenario } from "../../workflow/events";
import { OUTPUT_COLORS, useCountUp } from "./motion";

const OUTPUTS = [
  ["oil_pct", "Oil"],
  ["gas_pct", "Gas"],
  ["char_pct", "Char"],
  ["other_product_pct", "Other"],
] as const;

function Value({ value }: { value: number | undefined }) {
  const shown = useCountUp(value, { duration: 700 });
  return <span className="tabular">{value === undefined ? "—" : `${shown.toFixed(1)}%`}</span>;
}

function Side({ title, values, params, tone }: { title: string; values: Record<string, number>; params: Array<{ label: string; value: string }>; tone: "current" | "whatif" }) {
  return (
    <section className={`whatif-side is-${tone}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {params.map((param) => (
          <li key={param.label} className="flex justify-between">
            <span>{param.label}</span>
            <span className="tabular font-medium">{param.value}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-2">
        {OUTPUTS.map(([key, label]) => (
          <li key={key} className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-2 text-sm">
            <span>{label}</span>
            <span className="h-2.5 bg-paper2">
              <span className="block h-2.5 transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, values[key] ?? 0)}%`, background: OUTPUT_COLORS[key] }} />
            </span>
            <Value value={values[key]} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WhatIfComparison({ scenario, running }: { scenario: Scenario | null; running: boolean }) {
  if (!scenario) {
    return <p className="text-sm text-muted">Move a slider. The comparison appears after the model returns the new prediction.</p>;
  }
  const params = scenario.changes;
  const deltas = OUTPUTS.map(([key, label]) => {
    const before = scenario.before[key];
    const after = scenario.after[key];
    const delta = before !== undefined && after !== undefined ? after - before : null;
    return { key, label, delta };
  });
  return (
    <figure className={running ? "opacity-70 transition-opacity" : "transition-opacity"}>
      <div className="grid gap-3 md:grid-cols-2">
        <Side
          title="Current"
          tone="current"
          values={scenario.before}
          params={params.map((change) => ({ label: change.label, value: `${change.from.toFixed(1)} ${change.unit}` }))}
        />
        <Side
          title="What-if"
          tone="whatif"
          values={scenario.after}
          params={params.map((change) => ({ label: change.label, value: `${change.to.toFixed(1)} ${change.unit}` }))}
        />
      </div>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Change in predicted outputs">
        {deltas.map((item) =>
          item.delta === null ? null : (
            <li key={item.key} className={`delta-chip ${Math.abs(item.delta) < 0.05 ? "is-flat" : item.delta > 0 ? "is-up" : "is-down"}`}>
              {Math.abs(item.delta) < 0.05 ? "→" : item.delta > 0 ? "↑" : "↓"} {item.label} {item.delta > 0 ? "+" : ""}
              {item.delta.toFixed(2)} pp
            </li>
          ),
        )}
      </ul>
      <figcaption className="mt-2 text-xs text-muted">
        {params.length ? "" : "No input differs from the current sample. "}Both sides are model estimates from the same model. Arrows follow the returned values.
      </figcaption>
    </figure>
  );
}
