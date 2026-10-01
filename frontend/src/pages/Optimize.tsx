import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalysis } from "../state/AnalysisContext";
import { showNumber } from "../format";
import { OptimizationAnimation } from "../components/animations/OptimizationAnimation";

const OBJECTIVES = [
  ["energy_recovery", "Maximize energy recovery", "Proxy: predicted oil % + gas %. Not a megajoule yield."],
  ["material_recovery", "Maximize material recovery", "Proxy: predicted oil %. Not a recycling rate."],
  ["carbon_impact", "Minimize estimated carbon impact", "Unavailable unless you supply relative weights. No emission factors are included."],
  ["economic_value", "Maximize economic value", "Unavailable unless you supply relative weights. No prices are included."],
] as const;

export function Optimize() {
  const store = useAnalysis();
  const navigate = useNavigate();
  const [objective, setObjective] = useState<(typeof OBJECTIVES)[number][0]>("energy_recovery");
  const [weights, setWeights] = useState({ oil: "", gas: "", char: "", other: "" });
  const boundary = store.model?.optimization_boundary;
  const result = store.active?.optimization;

  if (!store.active?.prediction?.available) return <p>Run AI analysis before optimization.</p>;

  const parsedWeights = Object.fromEntries(
    Object.entries(weights)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [key, Number(value)]),
  );
  const needsWeights = objective === "carbon_impact" || objective === "economic_value";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Search</p>
        <h1 className="font-serif text-4xl font-medium">Pathway optimizer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          The trained model is the objective function. The search does not leave the training-data range.
        </p>
      </header>

      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Optimization boundary</h2>
        <p className="mt-2 text-sm text-muted">{boundary?.note} {boundary?.source}.</p>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {boundary
            ? Object.entries(boundary.ranges).map(([key, range]) => (
                <li key={key}>
                  {range.label}: {range.min}–{range.max} {range.unit}
                </li>
              ))
            : <li>Model ranges are still loading.</li>}
        </ul>
      </section>

      <fieldset className="space-y-2">
        <legend className="font-medium">Objective</legend>
        {OBJECTIVES.map(([id, label, note]) => (
          <label key={id} className="flex gap-3 border border-line bg-surface px-3 py-3 text-sm">
            <input type="radio" name="objective" checked={objective === id} onChange={() => setObjective(id)} />
            <span>
              <span className="block font-medium">{label}</span>
              <span className="text-muted">{note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {needsWeights ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["oil", "gas", "char", "other"] as const).map((key) => (
            <label key={key} className="text-sm">
              {key} weight
              <input
                className="mt-1 w-full border border-line px-2 py-1"
                inputMode="decimal"
                value={weights[key]}
                onChange={(event) => setWeights((current) => ({ ...current, [key]: event.target.value }))}
              />
            </label>
          ))}
          <p className="col-span-full text-sm text-muted">These are relative weights you supply. They are not market prices or emission factors.</p>
        </div>
      ) : null}

      <button
        className="bg-pine px-4 py-2 text-sm text-white disabled:opacity-50"
        type="button"
        disabled={store.busy === "optimize" || (needsWeights && Object.keys(parsedWeights).length < 4)}
        onClick={() => store.optimize(objective, needsWeights ? parsedWeights : undefined)}
      >
        {store.busy === "optimize" ? "Searching the training range…" : "Run optimization"}
      </button>

      {result || store.busy === "optimize" ? (
        <section className="border border-line bg-surface p-4">
          <OptimizationAnimation ranges={boundary?.ranges} optimization={result} running={store.busy === "optimize"} />
        </section>
      ) : null}

      {result ? (
        <section className="border border-line bg-surface p-4">
          {result.available && result.best ? (
            <>
              <h2 className="font-serif text-2xl">{result.objective}</h2>
              <p className="mt-2 text-sm">{result.proxy}. {result.proxy_note}</p>
              <p className="mt-2 text-sm">Evaluated {result.evaluated} configurations.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="py-2"> </th>
                      <th className="py-2">Current</th>
                      <th className="py-2">Best inside range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(result.best.configuration).map((key) => (
                      <tr key={key} className="border-b border-line">
                        <td className="py-2">{key}</td>
                        <td className="tabular">{showNumber(result.current?.configuration[key], 2)}</td>
                        <td className="tabular">{showNumber(result.best?.configuration[key], 2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-2">Proxy score</td>
                      <td>{showNumber(result.current?.score, 2)}</td>
                      <td>{showNumber(result.best.score, 2)} <span className="text-muted">model estimate</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="mt-4 border border-line px-3 py-2 text-sm" type="button" onClick={() => navigate("/app/simulate")}>
                Open What-If Lab
              </button>
            </>
          ) : (
            <p>{result.reason}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
