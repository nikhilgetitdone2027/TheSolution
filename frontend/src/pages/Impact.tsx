import { showNumber } from "../format";
import { useAnalysis } from "../state/AnalysisContext";
import { CommercialFeasibilityCard } from "../components/CommercialFeasibilityCard";
import { Comparative3WayLcaCard } from "../components/impact/Comparative3WayLcaCard";

export function Impact() {
  const { active } = useAnalysis();
  if (!active?.prediction?.available) return <p>Run AI analysis before opening impact.</p>;
  const heating = active.pathways?.heating_value;

  const oilPct = active.prediction.output_map?.oil_pct ?? active.prediction.outputs?.find((o) => o.key === "oil_pct")?.value ?? 68.5;
  const gasPct = active.prediction.output_map?.gas_pct ?? active.prediction.outputs?.find((o) => o.key === "gas_pct")?.value ?? 21.0;
  const charPct = active.prediction.output_map?.char_pct ?? active.prediction.outputs?.find((o) => o.key === "char_pct")?.value ?? 9.5;

  const lca = active.intelligence?.lca ?? active.pathways?.intelligence?.lca;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Impact</p>
        <h1 className="font-serif text-4xl font-medium">Impact & Techno-Economics</h1>
        <p className="mt-3 border border-line bg-[#f3efe4] px-4 py-3 text-sm">
          Impact and commercial metrics are model-derived empirical estimates based on trained chemical surrogate models.
        </p>
      </header>

      {/* Module 4: 3-Way Comparative LCA Displacement Engine */}
      <Comparative3WayLcaCard lca={lca} />

      {/* Techno-Economic Feasibility & ROI Layer */}
      <CommercialFeasibilityCard oilPct={oilPct} gasPct={gasPct} charPct={charPct} />

      <section className="grid gap-3 md:grid-cols-2">
        <article className="border border-line bg-surface p-4">
          <h2 className="font-serif text-xl">Predicted products</h2>
          <ul className="mt-3 text-sm">
            {active.prediction.outputs?.map((item) => (
              <li key={item.key}>
                {item.label}: {showNumber(item.value, 1, "%")} <span className="text-muted">Model estimate</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="border border-line bg-surface p-4">
          <h2 className="font-serif text-xl">Product mass flow</h2>
          {active.flows?.available ? (
            <ul className="mt-3 text-sm">
              {active.flows.flows?.map((flow) => (
                <li key={flow.key}>
                  {flow.label}: {showNumber(flow.kg_per_h, 3, " kg/h")} <span className="text-muted">Derived estimate</span>
                </li>
              ))}
              <li className="mt-2 text-muted">{active.flows.disclaimer}</li>
            </ul>
          ) : (
            <p className="mt-3 text-sm">{active.flows?.reason ?? "Insufficient data."}</p>
          )}
        </article>
        <article className="border border-line bg-surface p-4">
          <h2 className="font-serif text-xl">Feedstock heating value</h2>
          {heating?.available ? (
            <p className="mt-3 text-sm">
              {showNumber(heating.value_mj_per_kg, 2, " MJ/kg")} <span className="text-muted">Derived estimate · {heating.method}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm">{heating?.reason ?? "Insufficient data."}</p>
          )}
        </article>
        <article className="border border-line bg-surface p-4">
          <h2 className="font-serif text-xl">Additional Boundary Disclosures</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-muted">
            <li>Material recovery rate: evaluated per identified polymer stream.</li>
            <li>Carbon impact: baseline displacement accounting without uncharacterized fractions.</li>
            <li>Refinery projections: based on 1 TPD empirical conversion baseline.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
