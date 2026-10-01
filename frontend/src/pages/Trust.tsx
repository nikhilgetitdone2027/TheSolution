import { useState } from "react";
import { FeatureImportanceAnimation } from "../components/animations/FeatureImportanceAnimation";
import { SystemArchitectureAnimation } from "../components/animations/SystemArchitectureAnimation";
import { TrustCenterAnimation } from "../components/animations/TrustCenterAnimation";
import { HorizontalBars } from "../components/Charts";
import { showNumber } from "../format";
import { useAnalysis } from "../state/AnalysisContext";

export function Trust() {
  const { model, refresh, busy, active } = useAnalysis();
  const [view, setView] = useState<"trust" | "system">("trust");
  if (!model) {
    return (
      <div>
        <p>The model service is not available.</p>
        <button className="mt-3 border border-line px-3 py-2 text-sm" type="button" onClick={() => refresh()}>
          Retry
        </button>
      </div>
    );
  }
  const maxImportance = Math.max(...model.feature_importance.rows.map((row) => row.mean_mae_increase), 0.0001);
  const rows = model.feature_importance.rows.map((row) => ({
    name: row.label,
    value: Math.max(0, row.mean_mae_increase),
  }));
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Trust</p>
        <h1 className="font-serif text-4xl font-medium">Model Trust</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6">{model.dataset.disclaimer}</p>
      </header>
      <section className="border border-line bg-surface p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">{view === "trust" ? "Trust Center" : "System View"}</h2>
          <div className="flex gap-2" role="group" aria-label="Trust view">
            <button className={`chip ${view === "trust" ? "is-on" : ""}`} type="button" aria-pressed={view === "trust"} onClick={() => setView("trust")}>
              Evidence types
            </button>
            <button className={`chip ${view === "system" ? "is-on" : ""}`} type="button" aria-pressed={view === "system"} onClick={() => setView("system")}>
              System View
            </button>
          </div>
        </div>
        <div key={view} className="stage-enter">
          {view === "trust" ? <TrustCenterAnimation sample={active} model={model} /> : <SystemArchitectureAnimation />}
        </div>
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        <Stat label="Dataset rows" value={String(model.dataset.rows)} note={model.dataset.label} />
        <Stat label="Train / holdout" value={`${model.split.n_train} / ${model.split.n_validation_holdout}`} note={model.split.strategy} />
        <Stat label="Selected model" value={model.selected.model} note={model.selected.reason} />
      </section>
      <section className="overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-2">Model</th>
              <th>MAE</th>
              <th>RMSE</th>
              <th>R²</th>
            </tr>
          </thead>
          <tbody>
            {model.candidates.map((row) => (
              <tr key={row.model} className="border-b border-line">
                <td className="px-4 py-2">{row.model}{row.model === model.selected.model ? " · selected" : ""}</td>
                <td className="tabular">{showNumber(row.mae, 3)}</td>
                <td className="tabular">{showNumber(row.rmse, 3)}</td>
                <td className="tabular">{showNumber(row.r2, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-3 text-sm text-muted">Cross-validation on the training split. Holdout MAE {showNumber(model.holdout_metrics.mae, 3)}, RMSE {showNumber(model.holdout_metrics.rmse, 3)}, R² {showNumber(model.holdout_metrics.r2, 3)}.</p>
      </section>
      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Feature contribution</h2>
        <p className="mt-2 text-sm text-muted">{model.feature_importance.label} Bars are scaled to the largest computed value ({maxImportance.toFixed(3)}), not to a hardcoded percentage.</p>
        <div className="mt-4">
          <FeatureImportanceAnimation rows={model.feature_importance.rows} limit={model.feature_importance.rows.length} />
        </div>
        <HorizontalBars rows={rows} label={model.feature_importance.scoring} />
        <ul className="text-sm">
          {model.feature_importance.rows.map((row) => (
            <li key={row.feature}>
              {row.label}: mean MAE increase {row.mean_mae_increase.toFixed(4)} ± {row.std_mae_increase.toFixed(4)}
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-line bg-surface p-4 text-sm">
        <h2 className="font-serif text-2xl">Features in this model</h2>
        <p className="mt-2">{model.features.join(", ")}</p>
        <h3 className="mt-4 font-medium">Disabled or omitted</h3>
        <ul className="mt-2 list-disc pl-5">
          {model.omitted_features.map((item) => (
            <li key={item.feature}>{item.feature}: {item.reason}</li>
          ))}
        </ul>
        <p className="mt-4">Uncertainty: {model.supports_ensemble_spread ? "Tree ensemble spread is available." : "Ensemble spread is unavailable for the selected model."}</p>
        <p className="mt-4">Intended use: {model.intended_use}</p>
        <p className="mt-2">Not intended for: {model.non_intended_use}</p>
        {busy ? <p className="mt-2">Refreshing…</p> : null}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </article>
  );
}
