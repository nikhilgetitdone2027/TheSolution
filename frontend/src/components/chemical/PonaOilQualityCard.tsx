import type { ScientificIntelligence } from "../../types";
import { SpotlightCard } from "../layout/SpotlightCard";
import { AnimatedCounter } from "../animations/AnimatedCounter";

interface PonaOilQualityCardProps {
  oilQuality?: ScientificIntelligence["oil_quality"];
}

export function PonaOilQualityCard({ oilQuality }: PonaOilQualityCardProps) {
  if (!oilQuality) {
    return (
      <SpotlightCard className="p-5">
        <h2 className="font-serif text-2xl text-white">Pyrolysis Oil Quality & PONA</h2>
        <p className="mt-2 text-sm text-zinc-400">Calculating hydrocarbon distributions...</p>
      </SpotlightCard>
    );
  }

  const { hc_ratio, pona, refinery_verdict, oil_elemental } = oilQuality;

  return (
    <SpotlightCard as="article" spotlightColor="cyan" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-cyan-400">
            Module 3 · Pyrolysis Oil Quality & PONA
          </p>
          <h2 className="font-serif text-2xl font-medium text-white">
            Refinery Upgrading Classification & PONA Distribution
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-medium ${
              hc_ratio.color_badge === "emerald"
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                : hc_ratio.color_badge === "amber"
                ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
            }`}
          >
            H/C: <AnimatedCounter value={hc_ratio.hc_atomic_ratio} decimals={2} /> · {hc_ratio.classification}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* PONA Stacked Bar with Dynamic Liquid Shimmer Fill */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="font-medium text-zinc-200">ASTM D5443 PONA Hydrocarbon Distribution</span>
            <span>
              Total: <AnimatedCounter value={pona.pona_sum_pct} decimals={1} suffix="%" />
            </span>
          </div>

          <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 gap-0.5">
            <div
              className="liquid-bar-fill h-full rounded-full"
              style={{
                width: `${pona.paraffins_pct}%`,
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px rgba(16,185,129,0.5)",
              }}
              title={`Paraffins: ${pona.paraffins_pct}%`}
            />
            <div
              className="liquid-bar-fill h-full rounded-full"
              style={{
                width: `${pona.olefins_pct}%`,
                backgroundColor: "#06b6d4",
                boxShadow: "0 0 8px rgba(6,182,212,0.5)",
              }}
              title={`Olefins: ${pona.olefins_pct}%`}
            />
            <div
              className="liquid-bar-fill h-full rounded-full"
              style={{
                width: `${pona.aromatics_pct}%`,
                backgroundColor: "#f59e0b",
                boxShadow: "0 0 8px rgba(245,158,11,0.5)",
              }}
              title={`Aromatics: ${pona.aromatics_pct}%`}
            />
            <div
              className="liquid-bar-fill h-full rounded-full"
              style={{
                width: `${pona.naphthenes_oxygenates_pct}%`,
                backgroundColor: "#94a3b8",
                boxShadow: "0 0 8px rgba(148,163,184,0.4)",
              }}
              title={`Naphthenes/Oxygenates: ${pona.naphthenes_oxygenates_pct}%`}
            />
          </div>

          {/* Legend */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs font-mono">
            <div className="flex items-center gap-2 rounded bg-white/[0.03] p-1.5 border border-white/[0.04]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span className="text-zinc-300">
                Paraffins: <AnimatedCounter value={pona.paraffins_pct} decimals={1} suffix="%" />
              </span>
            </div>
            <div className="flex items-center gap-2 rounded bg-white/[0.03] p-1.5 border border-white/[0.04]">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              <span className="text-zinc-300">
                Olefins: <AnimatedCounter value={pona.olefins_pct} decimals={1} suffix="%" />
              </span>
            </div>
            <div className="flex items-center gap-2 rounded bg-white/[0.03] p-1.5 border border-white/[0.04]">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              <span className="text-zinc-300">
                Aromatics: <AnimatedCounter value={pona.aromatics_pct} decimals={1} suffix="%" />
              </span>
            </div>
            <div className="flex items-center gap-2 rounded bg-white/[0.03] p-1.5 border border-white/[0.04]">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.6)]" />
              <span className="text-zinc-300">
                Naphthenes/O₂: <AnimatedCounter value={pona.naphthenes_oxygenates_pct} decimals={1} suffix="%" />
              </span>
            </div>
          </div>
        </div>

        {/* Refinery Routing Verdict Card */}
        <div className="rounded-lg border border-white/[0.08] bg-black/40 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-mono font-medium">
              Refinery Routing Verdict
            </span>
            <span className="rounded bg-cyan-500/20 px-2.5 py-0.5 text-xs font-mono font-medium text-cyan-300 border border-cyan-500/30">
              {refinery_verdict.tier}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-white">
            {refinery_verdict.verdict}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-300 border-t border-white/[0.08] pt-2.5">
            <span>
              Oil C wt%:{" "}
              <strong className="text-white">
                <AnimatedCounter value={oil_elemental.C_oil_wt} decimals={1} suffix="%" />
              </strong>
            </span>
            <span>
              Oil H wt%:{" "}
              <strong className="text-white">
                <AnimatedCounter value={oil_elemental.H_oil_wt} decimals={1} suffix="%" />
              </strong>
            </span>
            <span>
              Hydrotreatment:{" "}
              <strong
                className={
                  refinery_verdict.hydrotreatment_mandatory
                    ? "text-amber-400"
                    : "text-emerald-400"
                }
              >
                {refinery_verdict.hydrotreatment_mandatory ? "Mandatory" : "Optional (< 10% blend)"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
