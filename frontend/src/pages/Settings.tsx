import { useAnalysis } from "../state/AnalysisContext";

const LIMITS = [
  "Model quality depends on the training data. This build uses an illustrative simulator because no experimental dataset was supplied.",
  "Predictions are not laboratory measurements.",
  "Extrapolation outside the training distribution is labeled and is not recommended.",
  "Chemical composition must come from reliable input data. A photograph is not used as an elemental analysis.",
  "Economic estimates are not shown unless you supply weights, and those weights are not market prices.",
  "Carbon-impact estimates are not shown. Emission factors are not included.",
  "The platform is a decision-support system, not a replacement for industrial engineering or laboratory validation.",
];

export function Settings() {
  const { health, model, refresh } = useAnalysis();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Settings</p>
        <h1 className="font-serif text-4xl font-medium">Settings</h1>
      </header>
      <section className="border border-line bg-surface p-4 text-sm">
        <h2 className="font-serif text-2xl">Service</h2>
        <p className="mt-2">API: reachable from this page.</p>
        <p>Model: {health?.model ? `${health.model.model} · ${health.model.dataset}` : health?.error ?? "Not connected"}</p>
        <button className="mt-3 border border-line px-3 py-2" type="button" onClick={() => refresh()}>
          Retry connection
        </button>
      </section>
      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Limitations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          {LIMITS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {model ? <p className="mt-4 text-sm text-muted">{model.dataset.disclaimer}</p> : null}
      </section>
    </div>
  );
}
