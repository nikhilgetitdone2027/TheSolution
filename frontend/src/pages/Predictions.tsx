import { HorizontalBars } from "../components/Charts";
import { Kind } from "../components/Shell";
import { useAnalysis } from "../state/AnalysisContext";
import { FeatureImportanceAnimation } from "../components/animations/FeatureImportanceAnimation";
import { PredictionReveal } from "../components/animations/PredictionReveal";
import { ProductFlow } from "../components/animations/ProductFlow";

export function Predictions() {
  const { active, model } = useAnalysis();
  const prediction = active?.prediction;
  if (!active) return <p>Upload a sample to begin.</p>;
  if (!prediction) return <p>Run AI analysis before viewing a prediction.</p>;
  if (!prediction.available) {
    return (
      <section className="max-w-2xl border border-line bg-surface p-5">
        <h1 className="font-serif text-3xl">Conversion prediction</h1>
        <p className="mt-3">Prediction unavailable.</p>
        <p className="mt-2 text-sm">{prediction.reason}</p>
      </section>
    );
  }
  const rows = (prediction.outputs ?? []).map((item) => ({ name: item.label, value: item.value }));
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Model estimate</p>
        <h1 className="font-serif text-4xl font-medium">Conversion Prediction</h1>
        <p className="mt-2 text-sm">{prediction.disclaimer}</p>
        <p className="text-sm text-muted">Model: {prediction.model}. {model?.postprocess}</p>
      </header>
      <section className="border border-line bg-surface p-4">
        <PredictionReveal prediction={prediction} />
      </section>
      <section className="border border-line bg-surface p-4">
        <h2 className="mb-2 font-serif text-2xl">Product flow</h2>
        <ProductFlow prediction={prediction} />
      </section>
      <section className="border border-line bg-surface p-4">
        <h2 className="mb-3 font-serif text-2xl">What the model responds to</h2>
        <FeatureImportanceAnimation rows={active.explanation?.importance ?? model?.feature_importance.rows ?? []} />
      </section>
      <section className="border border-line bg-surface p-4">
        <HorizontalBars rows={rows} unit="%" label="Predicted product distribution" />
        <ul className="mt-4 space-y-2">
          {(prediction.outputs ?? []).map((item) => (
            <li key={item.key} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
              <span>{item.label}</span>
              <span className="h-2 bg-paper2">
                <span className="block h-2 bg-pine" style={{ width: `${item.value}%` }} />
              </span>
              <span className="tabular">
                {item.value.toFixed(2)}% <Kind>{item.kind}</Kind>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Uncertainty</h2>
        {prediction.ensemble_spread ? (
          <ul className="mt-3 text-sm">
            {Object.entries(prediction.ensemble_spread).map(([key, item]) => (
              <li key={key}>
                {item.label}: ±{item.std_percentage_points.toFixed(2)} percentage points. {item.note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">Uncertainty estimate unavailable for the selected model. Tree-ensemble spread is reported only when a random forest is selected.</p>
        )}
        {(prediction.extrapolation ?? []).length ? (
          <ul className="mt-3 text-sm text-warn">
            {prediction.extrapolation?.map((item) => (
              <li key={item.feature}>{item.label}: {item.message}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">All model inputs are inside the training range.</p>
        )}
      </section>
      {active.explanation ? (
        <section className="border border-line bg-surface p-4">
          <h2 className="font-serif text-2xl">Explanation</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6">{active.explanation.answer.answer}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">{active.explanation.interpreter ?? "Grounded explanation engine"}</p>
        </section>
      ) : null}
    </div>
  );
}
