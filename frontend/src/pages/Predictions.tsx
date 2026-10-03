import { HorizontalBars } from "../components/Charts";
import { Kind } from "../components/Shell";
import { useAnalysis } from "../state/AnalysisContext";
import { FeatureImportanceAnimation } from "../components/animations/FeatureImportanceAnimation";
import { PredictionReveal } from "../components/animations/PredictionReveal";
import { ProductFlow } from "../components/animations/ProductFlow";
import { SpotlightCard } from "../components/layout/SpotlightCard";
import { AnimatedCounter } from "../components/animations/AnimatedCounter";
import { OUTPUT_COLORS } from "../components/animations/motion";

export function Predictions() {
  const { active, model } = useAnalysis();
  const prediction = active?.prediction;

  if (!active) {
    return (
      <SpotlightCard className="p-6">
        <p className="text-zinc-300">Upload a sample to begin.</p>
      </SpotlightCard>
    );
  }

  if (!prediction) {
    return (
      <SpotlightCard className="p-6">
        <p className="text-zinc-300">Run AI analysis before viewing a prediction.</p>
      </SpotlightCard>
    );
  }

  if (!prediction.available) {
    return (
      <SpotlightCard as="section" spotlightColor="amber" className="max-w-2xl p-6">
        <h1 className="font-serif text-3xl text-white">Conversion Prediction</h1>
        <p className="mt-3 text-rose-400 font-mono text-sm">Prediction unavailable.</p>
        <p className="mt-2 text-sm text-zinc-300">{prediction.reason}</p>
      </SpotlightCard>
    );
  }

  const rows = (prediction.outputs ?? []).map((item) => ({
    name: item.label,
    value: item.value,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Surrogate ML Output
          </p>
          <h1 className="font-serif text-4xl font-medium text-ink">Conversion Prediction</h1>
          <p className="mt-2 text-sm text-muted">{prediction.disclaimer}</p>
          <p className="text-xs font-mono text-muted">
            Model: {prediction.model}. {model?.postprocess}
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 font-mono text-xs text-emerald-300">
          Ensemble Validated
        </span>
      </header>

      {/* Primary KPI & Animated Yield Reveal */}
      <SpotlightCard as="section" spotlightColor="emerald" className="p-5">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Primary Yield Distribution
          </span>
          <span className="text-xs font-mono text-zinc-400">Surrogate Inference</span>
        </div>
        <PredictionReveal prediction={prediction} />
      </SpotlightCard>

      {/* Sankey Product Flow Diagram */}
      <SpotlightCard as="section" spotlightColor="cyan" className="p-5">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="font-serif text-2xl text-white">Product Flow Dynamics</h2>
          <span className="text-xs font-mono text-cyan-400">Sankey Mass Transfer</span>
        </div>
        <ProductFlow prediction={prediction} />
      </SpotlightCard>

      {/* Feature Importance Engine */}
      <SpotlightCard as="section" spotlightColor="emerald" className="p-5">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="font-serif text-2xl text-white">What the Model Responds To</h2>
          <span className="text-xs font-mono text-emerald-400">SHAP Attributions</span>
        </div>
        <FeatureImportanceAnimation
          rows={
            active.explanation?.importance ?? model?.feature_importance.rows ?? []
          }
        />
      </SpotlightCard>

      {/* Fluid Liquid-Fill Yield Progress Bars */}
      <SpotlightCard as="section" spotlightColor="emerald" className="p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div>
            <h2 className="font-serif text-2xl text-white">Predicted Product Distribution</h2>
            <p className="text-xs text-zinc-400">Dynamic liquid fill with continuous shimmer flow</p>
          </div>
          <span className="text-xs font-mono text-emerald-400">Validated Mass Yield</span>
        </div>

        <HorizontalBars rows={rows} unit="%" label="Predicted product distribution" />

        <ul className="mt-5 space-y-3">
          {(prediction.outputs ?? []).map((item) => {
            const color = OUTPUT_COLORS[item.key] ?? "#059669";
            return (
              <li
                key={item.key}
                className="grid grid-cols-[7.5rem_1fr_6rem] items-center gap-3.5 text-sm rounded-lg bg-white/[0.02] p-2.5 border border-white/[0.05]"
              >
                <span className="font-medium text-zinc-200">{item.label}</span>
                {/* Liquid fill bar with fluid 0.6s cubic-bezier transition & shimmer */}
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="liquid-bar-fill block h-full rounded-full"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 12px ${color}88`,
                    }}
                  />
                </div>
                <div className="text-right">
                  <span className="font-mono text-white font-semibold">
                    <AnimatedCounter value={item.value} decimals={2} suffix="%" />
                  </span>
                  <span className="ml-1.5 inline-block text-[10px] text-zinc-400">
                    <Kind>{item.kind}</Kind>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </SpotlightCard>

      {/* Uncertainty & Extrapolation Bound Analysis */}
      <SpotlightCard as="section" spotlightColor="amber" className="p-5">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="font-serif text-2xl text-white">Model Uncertainty & Trust</h2>
          <span className="text-xs font-mono text-amber-400">Variance Bounds</span>
        </div>

        {prediction.ensemble_spread ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            {Object.entries(prediction.ensemble_spread).map(([key, item]) => (
              <li
                key={key}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-sm"
              >
                <p className="text-xs font-mono uppercase text-zinc-400">{item.label}</p>
                <p className="mt-1 font-mono text-lg font-bold text-amber-300">
                  ±<AnimatedCounter value={item.std_percentage_points} decimals={2} /> pp
                </p>
                <p className="mt-1 text-xs text-zinc-400">{item.note}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-300">
            Uncertainty estimate unavailable for the selected model. Tree-ensemble spread is reported only when a random forest is selected.
          </p>
        )}

        {(prediction.extrapolation ?? []).length ? (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
            <p className="text-xs font-mono text-amber-400 uppercase">Extrapolation Warnings</p>
            <ul className="mt-2 space-y-1 text-xs text-amber-200">
              {prediction.extrapolation?.map((item) => (
                <li key={item.feature}>
                  <strong>{item.label}:</strong> {item.message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-xs font-mono text-emerald-400">
            ✓ All model inputs reside inside the empirical training range.
          </p>
        )}
      </SpotlightCard>

      {/* Explanation Intelligence */}
      {active.explanation ? (
        <SpotlightCard as="section" spotlightColor="emerald" className="p-5">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="font-serif text-2xl text-white">Scientific Explanation</h2>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-400">
              {active.explanation.interpreter ?? "Grounded explanation engine"}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-200">
            {active.explanation.answer.answer}
          </p>
        </SpotlightCard>
      ) : null}
    </div>
  );
}
