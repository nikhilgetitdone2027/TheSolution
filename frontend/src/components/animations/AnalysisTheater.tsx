import type { ReactNode } from "react";
import { useAnalysis } from "../../state/AnalysisContext";
import { STEP_ORDER, useWorkflow, workflow, type AnalysisWorkflowState } from "../../workflow/engine";
import { AnalysisPipeline, STEP_LABELS } from "./AnalysisPipeline";
import { CompositionAnimation } from "./CompositionAnimation";
import { FeatureImportanceAnimation } from "./FeatureImportanceAnimation";
import { MaterialBalance } from "./MaterialBalance";
import { MLInferenceAnimation } from "./MLInferenceAnimation";
import { OptimizationAnimation } from "./OptimizationAnimation";
import { PredictionReveal } from "./PredictionReveal";
import { ProductFlow } from "./ProductFlow";
import { SampleFlowAnimation } from "./SampleFlowAnimation";
import { StepBadge, STATUS_TEXT } from "./StepBadge";
import { ValidationAnimation } from "./ValidationAnimation";

const TITLES: Record<string, string> = {
  sample: "Sample ingestion",
  composition: "Reading composition",
  validation: "Validating inputs",
  ml: "ML inference",
  prediction: "Prediction",
  flow: "Predicted product distribution",
  explanation: "What the model responds to",
  optimization: "Model search within observed training-data ranges",
  best: "Best model-supported configuration",
  complete: "Analysis complete",
};

function stageTitle(engine: AnalysisWorkflowState): string {
  if (engine.status === "error") return "Analysis stopped";
  return TITLES[engine.focus ?? ""] ?? "Analysis";
}

export function AnalysisTheater() {
  const engine = useWorkflow();
  const store = useAnalysis();
  const sample = store.samples.find((item) => item.id === engine.sampleId) ?? null;
  const show = engine.theaterOpen && engine.status !== "idle" && sample;
  if (!show) return null;

  const expanded = engine.theaterOpen;
  const processing = (id: keyof AnalysisWorkflowState["steps"]) => engine.steps[id].status === "processing";
  const prediction = engine.data.prediction;
  let visual: ReactNode = null;

  if (engine.status === "error") {
    visual = (
      <div className="space-y-4">
        <p className="text-sm text-bad" role="alert">
          ✕ {engine.error}
        </p>
        {engine.focus === "validation" ? <ValidationAnimation validation={engine.data.validation} running={false} /> : null}
      </div>
    );
  } else if (engine.focus === "sample") {
    visual = <SampleFlowAnimation sample={sample} />;
  } else if (engine.focus === "composition") {
    visual = (
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <CompositionAnimation sample={sample} />
        <MaterialBalance sample={sample} />
      </div>
    );
  } else if (engine.focus === "validation") {
    visual = (
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <ValidationAnimation validation={engine.data.validation} running={processing("validation")} />
        <MaterialBalance sample={sample} validation={engine.data.validation} />
      </div>
    );
  } else if (engine.focus === "ml") {
    visual = (
      <MLInferenceAnimation
        features={store.model?.features ?? []}
        sample={sample}
        modelName={store.model?.selected.model ?? "Model"}
        prediction={prediction}
        running={processing("ml")}
      />
    );
  } else if (engine.focus === "prediction" && prediction?.available) {
    visual = <PredictionReveal prediction={prediction} />;
  } else if (engine.focus === "prediction") {
    visual = <p className="text-sm">Prediction unavailable. {prediction?.reason}</p>;
  } else if (engine.focus === "flow" && prediction?.available) {
    visual = <ProductFlow prediction={prediction} />;
  } else if (engine.focus === "explanation") {
    visual = processing("explanation") ? (
      <p className="text-sm text-muted">Measuring how much model error grows when each input is shuffled.</p>
    ) : (
      <FeatureImportanceAnimation rows={engine.data.importance ?? []} limit={5} />
    );
  } else if (engine.focus === "optimization" || engine.focus === "best") {
    visual =
      engine.steps.optimization.status === "skipped" ? (
        <p className="text-sm">↷ Optimization skipped. {engine.steps.optimization.detail}</p>
      ) : (
        <OptimizationAnimation
          ranges={store.model?.optimization_boundary.ranges}
          optimization={engine.data.optimization}
          running={processing("optimization")}
        />
      );
  } else if (engine.focus === "complete") {
    visual = (
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEP_ORDER.filter((id) => engine.steps[id].status !== "idle").map((id, index) => (
          <li key={id} className="flex items-center gap-2 border border-line bg-paper px-3 py-2 text-sm fade-up" style={{ animationDelay: `${index * 80}ms` }}>
            <StepBadge status={engine.steps[id].status} label={STEP_LABELS[id]} />
            <span>
              <span className="block font-medium">{STEP_LABELS[id]}</span>
              <span className="block text-xs text-muted">{engine.steps[id].detail ?? STATUS_TEXT[engine.steps[id].status]}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="theater" aria-label="Analysis workflow" data-guided-ui>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {engine.status === "running" ? "Analysis in progress" : engine.status === "error" ? "Analysis stopped" : "Analysis finished"} · {sample.name}
          </p>
          <h2 className="font-serif text-2xl" aria-live="polite">
            {stageTitle(engine)}
          </h2>
        </div>
        <button className="border border-line px-3 py-1 text-sm" type="button" onClick={() => workflow.setTheater(false)}>
          Collapse
        </button>
      </header>
      <div className="mt-4">
        <AnalysisPipeline compact />
      </div>
      {expanded ? (
        <div key={`${engine.focus}-${engine.status}`} className="stage-enter mt-5">
          {visual}
        </div>
      ) : null}
      {engine.caption && !engine.guided ? <p className="theater-caption mt-4 text-sm leading-6">{engine.caption}</p> : null}
    </section>
  );
}

export function TheaterReopen() {
  const engine = useWorkflow();
  if (engine.theaterOpen || engine.status === "idle" || !engine.sampleId || engine.status === "success") return null;
  return (
    <button className="theater-reopen" type="button" onClick={() => workflow.setTheater(true)}>
      <StepBadge status="processing" /> Show analysis ({STEP_LABELS[STEP_ORDER.find((id) => engine.steps[id].status === "processing") ?? "sample"]})
    </button>
  );
}
