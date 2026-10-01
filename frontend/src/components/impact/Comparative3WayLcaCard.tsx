import type { ScientificIntelligence } from "../../types";

interface Comparative3WayLcaCardProps {
  lca?: ScientificIntelligence["lca"];
}

export function Comparative3WayLcaCard({ lca }: Comparative3WayLcaCardProps) {
  if (!lca) {
    return (
      <div className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">3-Way Comparative Life Cycle Assessment (LCA)</h2>
        <p className="mt-2 text-sm text-muted">Calculating displacement carbon accounting...</p>
      </div>
    );
  }

  const { pathways, net_carbon_avoided_vs_incineration_ton_per_ton, net_carbon_avoided_daily_ton_co2e, plant_daily_tpd, methodology } = lca;

  return (
    <article className="border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Module 4 · Environmental Carbon Accounting</p>
          <h2 className="font-serif text-2xl font-medium">3-Way Comparative Life Cycle Assessment (LCA)</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-mono font-medium text-emerald-800 ring-1 ring-emerald-500/30">
            Avoided vs Incineration: {net_carbon_avoided_vs_incineration_ton_per_ton} T CO₂e/ton
          </span>
        </div>
      </div>

      {/* Avoided Emissions Hero Banner */}
      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800">
              Net Decarbonization Dividend
            </span>
            <p className="font-serif text-3xl font-medium text-emerald-950">
              {net_carbon_avoided_daily_ton_co2e} <span className="text-lg font-normal">Tonnes CO₂e Avoided / Day</span>
            </p>
          </div>
          <p className="text-xs text-emerald-800 max-w-md">
            Based on {plant_daily_tpd} TPD continuous processing replacing mass-burn incineration and displacing virgin petrochemical naphtha extraction.
          </p>
        </div>
      </div>

      {/* 3-Column Comparative Matrix */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {pathways.map((pathway) => {
          const isPyrolysis = pathway.id === "pyrolysis";
          const isIncineration = pathway.id === "incineration";

          return (
            <div
              key={pathway.id}
              className={`rounded-xl border p-4 transition-all ${
                isPyrolysis
                  ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20 shadow-sm"
                  : "border-line bg-panel/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-medium text-ink">{pathway.name}</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                    isPyrolysis
                      ? "bg-emerald-500/20 text-emerald-800 font-semibold"
                      : isIncineration
                      ? "bg-rose-500/15 text-rose-700"
                      : "bg-slate-400/20 text-muted"
                  }`}
                >
                  {pathway.badge}
                </span>
              </div>

              {/* Key badges */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <span className="text-muted">Net Carbon Footprint:</span>
                  <span
                    className={`font-mono font-semibold ${
                      pathway.net_carbon_emissions_ton_co2e <= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {pathway.net_carbon_emissions_ton_co2e > 0 ? "+" : ""}
                    {pathway.net_carbon_emissions_ton_co2e} T CO₂e/ton
                  </span>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <span className="text-muted">Net Energy Recovery:</span>
                  <span className="font-mono text-ink font-medium">
                    {pathway.energy_gain_mj.toLocaleString()} MJ
                  </span>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <span className="text-muted">Circular Material Yield:</span>
                  <span className="font-mono text-ink font-medium">
                    {pathway.circular_polymer_yield_pct}%
                  </span>
                </div>
              </div>

              {/* Bullet points */}
              <ul className="mt-3 list-disc pl-4 text-xs text-muted space-y-1">
                {(pathway.advantages ?? pathway.disadvantages ?? []).map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted italic">
        * Provenance: {methodology}
      </p>
    </article>
  );
}
