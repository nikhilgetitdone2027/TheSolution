import type { ScientificIntelligence } from "../../types";

interface PretreatmentAcidGasCardProps {
  contamination?: ScientificIntelligence["contamination"];
}

export function PretreatmentAcidGasCard({ contamination }: PretreatmentAcidGasCardProps) {
  if (!contamination) {
    return (
      <div className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Acid Gas & Pretreatment Sizing</h2>
        <p className="mt-2 text-sm text-muted">Calculating stoichiometric acid gas balances...</p>
      </div>
    );
  }

  const { dechlorination, sublimation, synergy } = contamination;
  const isHighRisk = dechlorination.alert === "ACID_GAS_CORROSION_RISK";
  const isPetRisk = sublimation.alert === "SOLID_DEPOSITION_RISK";

  return (
    <article className="border border-line bg-surface p-5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Module 1 · Stoichiometry & Contamination</p>
          <h2 className="font-serif text-2xl font-medium">Acid Gas Scrubber & Pretreatment Sizing</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium ${
              isHighRisk
                ? "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30"
                : "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isHighRisk ? "animate-pulse bg-rose-500" : "bg-emerald-600"}`} />
            {dechlorination.alert}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-mono ${
              synergy.classification === "HIGH_SYNERGY"
                ? "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20"
                : synergy.classification === "NEUTRAL"
                ? "bg-blue-500/10 text-blue-800 ring-1 ring-blue-500/20"
                : "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20"
            }`}
          >
            {synergy.classification}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* PVC Dechlorination & HCl */}
        <div className="rounded-lg border border-line bg-panel/50 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">PVC Dehydrochlorination</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ink">
            {dechlorination.hcl_yield_kg} <span className="text-sm font-normal text-muted">kg HCl / ton</span>
          </p>
          <p className="mt-2 text-xs text-muted">
            From {dechlorination.pvc_pct}% feed PVC ({dechlorination.pvc_mass_kg} kg PVC/ton). Repeat unit MW ratio 36.46 / 62.50.
          </p>
          <div className="mt-3 rounded border border-line/60 bg-paper/60 p-2 text-[11px] font-mono text-muted">
            C₂H₃Cl → C₂H₂ + HCl ↑
          </div>
        </div>

        {/* Lime Sorbent Bed Sizing */}
        <div className="rounded-lg border border-line bg-panel/50 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Ca(OH)₂ Sorbent Bed Demand</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ink">
            {dechlorination.caoh2_sorbent_req_kg} <span className="text-sm font-normal text-muted">kg / ton</span>
          </p>
          <p className="mt-2 text-xs text-muted">
            Hydrated lime neutralizer with 20% industrial safety excess factor (MW: 74.09 g/mol).
          </p>
          <div className="mt-3 rounded border border-line/60 bg-paper/60 p-2 text-[11px] font-mono text-muted">
            {dechlorination.neutralization_reaction}
          </div>
        </div>

        {/* PET Condenser Sublimation Risk */}
        <div className="rounded-lg border border-line bg-panel/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted">PET Sublimation Risk</p>
            <span
              className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                isPetRisk ? "bg-rose-500/20 text-rose-700" : "bg-emerald-500/20 text-emerald-800"
              }`}
            >
              {sublimation.risk_level}
            </span>
          </div>
          <p className="mt-1 font-mono text-xl font-semibold text-ink">
            {sublimation.pet_pct}% <span className="text-sm font-normal text-muted">PET in blend</span>
          </p>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            {sublimation.detail}
          </p>
          <p className="mt-2 text-[11px] font-medium text-emerald-800">
            {sublimation.mitigation}
          </p>
        </div>
      </div>

      {/* Recommended Process Regime */}
      <div className="mt-4 rounded-lg border border-line bg-[#f8f5ee] p-3 text-xs">
        <span className="font-semibold text-ink">Operational Mitigation Directive: </span>
        <span className="text-muted">{dechlorination.recommendation}</span>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
          <span>Radical synergy:</span>
          <span className="font-medium text-ink">{synergy.mechanism}</span>
        </div>
      </div>
    </article>
  );
}
