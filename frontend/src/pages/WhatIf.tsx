import { useEffect, useRef, useState } from "react";
import { WhatIfComparison } from "../components/animations/WhatIfComparison";
import { StepBadge } from "../components/animations/StepBadge";
import { GroupedBars } from "../components/Charts";
import { ReactorDigitalTwin3D } from "../components/reactor/ReactorDigitalTwin3D";
import { showNumber } from "../format";
import { useAnalysis } from "../state/AnalysisContext";
import { useWorkflow } from "../workflow/engine";

const CONTROLS = ["temperature_c", "residence_time_min", "particle_size_mm", "feed_rate_kg_h"] as const;

export function WhatIf() {
  const store = useAnalysis();
  const engine = useWorkflow();
  const boundary = store.model?.optimization_boundary.ranges;
  const base = store.active?.inputs;
  const [draft, setDraft] = useState<Record<string, number>>({});
  const timer = useRef<number | undefined>(undefined);
  const simulateRef = useRef(store.simulate);
  simulateRef.current = store.simulate;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!store.active?.optimization?.available || !boundary || !base) {
    return <p>Run optimization before opening the What-If Lab.</p>;
  }

  const current = (key: (typeof CONTROLS)[number]) => draft[key] ?? Number(base[key] ?? boundary[key].min);
  const activeTemp = current("temperature_c");
  const pePpRatio = ((Number(base.pe_pct ?? 0) + Number(base.pp_pct ?? 0)) || 65) / 100;

  function change(key: string, value: number) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      simulateRef.current(next).catch(() => undefined);
    }, 550);
  }

  const simulation = engine.steps.simulation;
  const running = simulation.status === "processing";
  const scenario = store.scenario ?? engine.data.scenario ?? null;
  const before = store.simulation?.before.output_map ?? store.active.prediction?.output_map;
  const after = store.simulation?.after.output_map ?? before;
  const chartRows = ["oil_pct", "gas_pct", "char_pct", "other_product_pct"].map((key) => ({
    name: key.replace("_pct", ""),
    Before: before?.[key] ?? 0,
    After: after?.[key] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Simulation</p>
        <h1 className="font-serif text-4xl font-medium">What-If Lab</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Explore how process changes affect predicted outcomes.</p>
        <p className="mt-1 text-sm text-muted">Controls stay inside the training range. The prediction re-runs shortly after you stop moving a slider.</p>
      </header>

      {/* 3D Pyrolysis Reactor Digital Twin */}
      <ReactorDigitalTwin3D
        temperatureC={activeTemp}
        pePpFraction={pePpRatio}
        residenceTimeMin={current("residence_time_min")}
        feedRateKgH={current("feed_rate_kg_h")}
      />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="border border-line bg-surface p-4">
          {CONTROLS.map((key) => {
            const range = boundary[key];
            return (
              <label key={key} className="mb-4 block text-sm">
                <span className="flex justify-between">
                  <span>{range.label}</span>
                  <span className="tabular">
                    {current(key).toFixed(1)} {range.unit}
                  </span>
                </span>
                <input
                  className="mt-2 w-full"
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={(range.max - range.min) / 40}
                  value={current(key)}
                  onChange={(event) => change(key, Number(event.target.value))}
                />
                <span className="text-xs text-muted">
                  Training data range: {range.min}–{range.max}
                </span>
              </label>
            );
          })}
          <button
            className="btn border border-line px-4 py-2 text-sm"
            type="button"
            disabled={!Object.keys(draft).length}
            onClick={() => store.simulate(draft, "User-defined configuration").catch(() => undefined)}
          >
            Save scenario
          </button>
        </section>
        <section className="border border-line bg-surface p-4" aria-live="polite">
          <p className="mb-3 flex items-center gap-2 text-sm">
            <StepBadge status={simulation.status} label="What-if" />
            <span>{running ? "Model re-evaluating" : simulation.status === "success" ? "Prediction updated" : simulation.status === "error" ? simulation.detail : "Move a slider to compare"}</span>
          </p>
          <WhatIfComparison scenario={scenario} running={running} />
        </section>
      </div>
      <section className="border border-line bg-surface p-4">
        <GroupedBars rows={chartRows} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1">Output</th>
                <th>Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {chartRows.map((row) => (
                <tr key={row.name} className="border-t border-line">
                  <td className="py-2 capitalize">{row.name}</td>
                  <td className="tabular">{showNumber(row.Before, 1, "%")}</td>
                  <td className="tabular">
                    {showNumber(row.After, 1, "%")} <span className="text-muted">model estimate</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
