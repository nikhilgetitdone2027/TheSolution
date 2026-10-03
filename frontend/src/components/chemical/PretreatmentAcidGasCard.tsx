import type { ScientificIntelligence } from "../../types";
import { SpotlightCard } from "../layout/SpotlightCard";
import { AnimatedCounter } from "../animations/AnimatedCounter";

interface PretreatmentAcidGasCardProps {
  contamination?: ScientificIntelligence["contamination"];
}

export function PretreatmentAcidGasCard({ contamination }: PretreatmentAcidGasCardProps) {
  if (!contamination) {
    return (
      <SpotlightCard className="p-5">
        <h2 className="font-serif text-2xl text-white">Acid Gas & Pretreatment Sizing</h2>
        <p className="mt-2 text-sm text-zinc-400">Calculating stoichiometric acid gas balances...</p>
      </SpotlightCard>
    );
  }

  const { dechlorination, sublimation, synergy } = contamination;
  const isHighRisk = dechlorination.alert === "ACID_GAS_CORROSION_RISK";
  const isPetRisk = sublimation.alert === "SOLID_DEPOSITION_RISK";

  return (
    <SpotlightCard
      as="article"
      spotlightColor={isHighRisk ? "amber" : "emerald"}
      className="p-5 transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Module 1 · Stoichiometry & Contamination
          </p>
          <h2 className="font-serif text-2xl font-medium text-white">
            Acid Gas Scrubber & Pretreatment Sizing
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-medium ${
              isHighRisk
                ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isHighRisk ? "animate-pulse bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "bg-emerald-400"
              }`}
            />
            {dechlorination.alert}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-mono ${
              synergy.classification === "HIGH_SYNERGY"
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : synergy.classification === "NEUTRAL"
                ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30"
                : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
            }`}
          >
            {synergy.classification}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* PVC Dechlorination & HCl */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400">PVC Dehydrochlorination</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white">
            <AnimatedCounter value={dechlorination.hcl_yield_kg} decimals={2} />{" "}
            <span className="text-sm font-normal text-zinc-400">kg HCl / ton</span>
          </p>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            From {dechlorination.pvc_pct}% feed PVC ({dechlorination.pvc_mass_kg} kg PVC/ton). Repeat unit MW ratio 36.46 / 62.50.
          </p>
          <div className="mt-3 rounded border border-white/10 bg-black/40 p-2 text-[11px] font-mono text-emerald-300">
            C₂H₃Cl → C₂H₂ + HCl ↑
          </div>
        </div>

        {/* Lime Sorbent Bed Sizing */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400">Ca(OH)₂ Sorbent Bed Demand</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
            <AnimatedCounter value={dechlorination.caoh2_sorbent_req_kg} decimals={2} />{" "}
            <span className="text-sm font-normal text-zinc-400">kg / ton</span>
          </p>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Hydrated lime neutralizer with 20% industrial safety excess factor (MW: 74.09 g/mol).
          </p>
          <div className="mt-3 rounded border border-white/10 bg-black/40 p-2 text-[11px] font-mono text-cyan-300">
            {dechlorination.neutralization_reaction}
          </div>
        </div>

        {/* PET Condenser Sublimation Risk */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">PET Sublimation Risk</p>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                isPetRisk
                  ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
              }`}
            >
              {sublimation.risk_level}
            </span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-white">
            <AnimatedCounter value={sublimation.pet_pct} decimals={1} suffix="%" />{" "}
            <span className="text-sm font-normal text-zinc-400">PET in blend</span>
          </p>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            {sublimation.detail}
          </p>
          <p className="mt-2 text-[11px] font-mono text-emerald-400">
            {sublimation.mitigation}
          </p>
        </div>
      </div>

      {/* Recommended Process Regime */}
      <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/40 p-3.5 text-xs backdrop-blur-sm">
        <span className="font-semibold text-emerald-400 font-mono">Operational Mitigation Directive: </span>
        <span className="text-zinc-300">{dechlorination.recommendation}</span>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-mono text-cyan-400">Radical synergy:</span>
          <span className="text-zinc-200">{synergy.mechanism}</span>
        </div>
      </div>
    </SpotlightCard>
  );
}
