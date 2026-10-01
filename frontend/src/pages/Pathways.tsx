import { useState } from "react";
import { useAnalysis } from "../state/AnalysisContext";
import type { Pathway } from "../types";

export function Pathways() {
  const { active } = useAnalysis();
  const [open, setOpen] = useState<string | null>("pyrolysis");
  if (!active?.pathways) return <p>Run AI analysis before comparing pathways.</p>;
  const selected = active.pathways.pathways.find((pathway) => pathway.id === open) ?? null;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Comparison</p>
        <h1 className="font-serif text-4xl font-medium">Recovery pathways</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Pyrolysis has a trained yield model. Mechanical recycling and energy recovery are shown with only the metrics this dataset can support.
        </p>
      </header>
      <div className="grid gap-3 lg:grid-cols-3">
        {active.pathways.pathways.map((pathway) => (
          <button
            key={pathway.id}
            type="button"
            className={`border p-4 text-left ${open === pathway.id ? "border-ink bg-surface" : "border-line"}`}
            onClick={() => setOpen(pathway.id)}
          >
            <h2 className="font-serif text-2xl">{pathway.name}</h2>
            <p className="mt-2 text-sm text-muted">{pathway.summary}</p>
          </button>
        ))}
      </div>
      {selected ? <PathwayDetail pathway={selected} /> : null}
      {active.pathways.context.length ? (
        <section className="border border-line bg-surface p-4">
          <h2 className="font-serif text-xl">Composition context</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {active.pathways.context.map((item) => (
              <li key={item.topic}>
                <span className="font-medium">{item.topic}. </span>
                {item.detail}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PathwayDetail({ pathway }: { pathway: Pathway }) {
  return (
    <section className="border border-line bg-surface p-5">
      <h2 className="font-serif text-2xl">{pathway.name}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 font-medium">Metric</th>
              <th className="py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {pathway.metrics.map((metric) => (
              <tr key={metric.name} className="border-b border-line">
                <td className="py-3 pr-4">{metric.name}</td>
                <td className="py-3">
                  {metric.available ? (
                    <span>
                      {metric.value !== undefined ? `${metric.value.toFixed(2)} ${metric.unit ?? ""}` : "Shown in the prediction"}{" "}
                      <span className="text-muted">({metric.kind})</span>
                      {metric.equation ? <span className="mt-1 block text-muted">{metric.equation}</span> : null}
                    </span>
                  ) : (
                    <span>Insufficient data. {metric.reason}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <h3 className="font-medium">Assumptions</h3>
          <ul className="mt-2 list-disc pl-5">{pathway.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3 className="font-medium">Model source</h3>
          <p className="mt-2">{pathway.model_source}</p>
          <h3 className="mt-3 font-medium">Data requirements</h3>
          <ul className="mt-2 list-disc pl-5">{pathway.data_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      <h3 className="mt-4 font-medium">Limitations</h3>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {pathway.limitations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
