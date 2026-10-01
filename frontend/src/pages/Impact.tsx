import { showNumber } from "../format";
import { useAnalysis } from "../state/AnalysisContext";

export function Impact() {
  const { active } = useAnalysis();
  if (!active?.prediction?.available) return <p>Run AI analysis before opening impact.</p>;
  const heating = active.pathways?.heating_value;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Impact</p>
        <h1 className="font-serif text-4xl font-medium">Impact</h1>
        <p className="mt-3 border border-line bg-[#f3efe4] px-4 py-3 text-sm">Impact calculations are model-derived estimates.</p>
      </header>
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
          <h2 className="font-serif text-xl">Not calculated</h2>
          <ul className="mt-3 list-disc pl-5 text-sm">
            <li>Material recovery rate: insufficient data.</li>
            <li>Waste diverted against a disposal baseline: insufficient data.</li>
            <li>Carbon impact: insufficient data.</li>
            <li>Economic value: insufficient data.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
