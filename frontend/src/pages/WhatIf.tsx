import { useEffect, useRef, useState } from "react";
import { WhatIfComparison } from "../components/animations/WhatIfComparison";
import { StepBadge } from "../components/animations/StepBadge";
import { AnimatedCounter } from "../components/animations/AnimatedCounter";
import { GroupedBars } from "../components/Charts";
import { ReactorDigitalTwin3D } from "../components/reactor/ReactorDigitalTwin3D";
import { SpotlightCard } from "../components/layout/SpotlightCard";
import { useAnalysis } from "../state/AnalysisContext";
import { useWorkflow } from "../workflow/engine";

const CONTROLS = [
  "temperature_c",
  "residence_time_min",
  "particle_size_mm",
  "feed_rate_kg_h",
] as const;

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
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <p className="text-muted">Run optimization before opening the What-If Lab.</p>
      </div>
    );
  }

  const current = (key: (typeof CONTROLS)[number]) =>
    draft[key] ?? Number(base[key] ?? boundary[key].min);
  const activeTemp = current("temperature_c");
  const pePpRatio =
    ((Number(base.pe_pct ?? 0) + Number(base.pp_pct ?? 0)) || 65) / 100;

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
  const before =
    store.simulation?.before.output_map ?? store.active.prediction?.output_map;
  const after = store.simulation?.after.output_map ?? before;
  const chartRows = ["oil_pct", "gas_pct", "char_pct", "other_product_pct"].map(
    (key) => ({
      name: key.replace("_pct", ""),
      Before: before?.[key] ?? 0,
      After: after?.[key] ?? 0,
    })
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
          Simulation Lab
        </p>
        <h1 className="font-serif text-4xl font-medium text-ink">What-If Lab</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Explore how process changes affect surrogate ML predicted outcomes in real time.
        </p>
        <p className="mt-1 text-xs text-muted">
          Controls stay inside the trained manifold boundary. The surrogate re-infers smoothly after slider movement.
        </p>
      </header>

      {/* 3D Pyrolysis Reactor Digital Twin */}
      <ReactorDigitalTwin3D
        temperatureC={activeTemp}
        pePpFraction={pePpRatio}
        residenceTimeMin={current("residence_time_min")}
        feedRateKgH={current("feed_rate_kg_h")}
      />

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Controls Panel with Spotlight Effect */}
        <SpotlightCard as="section" className="p-5" spotlightColor="emerald">
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="font-serif text-lg font-medium text-white">Process Controls</h2>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
              Surrogate Inputs
            </span>
          </div>

          {CONTROLS.map((key) => {
            const range = boundary[key];
            return (
              <label key={key} className="mb-4 block text-sm">
                <span className="flex justify-between items-center text-xs">
                  <span className="text-zinc-300 font-medium">{range.label}</span>
                  <span className="text-emerald-400 font-mono">
                    <AnimatedCounter
                      value={current(key)}
                      decimals={1}
                      suffix={` ${range.unit}`}
                    />
                  </span>
                </span>
                <input
                  className="mt-2 w-full accent-emerald-500 cursor-pointer"
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={(range.max - range.min) / 40}
                  value={current(key)}
                  onChange={(event) => change(key, Number(event.target.value))}
                />
                <span className="text-[11px] text-zinc-400">
                  Training range: {range.min}–{range.max} {range.unit}
                </span>
              </label>
            );
          })}

          <button
            className="btn mt-2 w-full rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs font-mono font-semibold text-emerald-300 transition-all hover:bg-emerald-900/40 hover:border-emerald-500/60 disabled:opacity-40"
            type="button"
            disabled={!Object.keys(draft).length}
            onClick={() =>
              store.simulate(draft, "User-defined configuration").catch(() => undefined)
            }
          >
            Save Scenario
          </button>
        </SpotlightCard>

        {/* Comparison Panel with Spotlight Effect */}
        <SpotlightCard as="section" className="p-5" spotlightColor="cyan" aria-live="polite">
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <StepBadge status={simulation.status} label="What-if" />
              <span className="text-xs font-mono text-zinc-300">
                {running
                  ? "Surrogate re-inferring..."
                  : simulation.status === "success"
                  ? "Inference updated"
                  : simulation.status === "error"
                  ? simulation.detail
                  : "Move slider to compare"}
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">Yield Delta</span>
          </div>

          <WhatIfComparison scenario={scenario} running={running} />
        </SpotlightCard>
      </div>

      {/* Yield Bar Chart & Detailed Table Panel */}
      <SpotlightCard as="section" className="p-5" spotlightColor="emerald">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="font-serif text-lg font-medium text-white">Surrogate Yield Shift Analysis</h2>
          <span className="text-[11px] font-mono text-zinc-400">Before vs After Comparison</span>
        </div>

        <GroupedBars rows={chartRows} />

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-xs font-mono uppercase text-zinc-400">
                <th className="py-2">Output Stream</th>
                <th>Baseline</th>
                <th>Simulated</th>
                <th>Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {chartRows.map((row) => {
                const shift = row.After - row.Before;
                return (
                  <tr key={row.name} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-2.5 font-medium capitalize text-zinc-200">{row.name}</td>
                    <td className="tabular text-zinc-300">
                      <AnimatedCounter value={row.Before} decimals={1} suffix="%" />
                    </td>
                    <td className="tabular text-emerald-400 font-medium">
                      <AnimatedCounter value={row.After} decimals={1} suffix="%" />
                    </td>
                    <td className="tabular font-mono text-xs">
                      <span
                        className={
                          Math.abs(shift) < 0.05
                            ? "text-zinc-400"
                            : shift > 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        <AnimatedCounter
                          value={shift}
                          decimals={2}
                          prefix={shift > 0 ? "+" : ""}
                          suffix=" pp"
                        />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
