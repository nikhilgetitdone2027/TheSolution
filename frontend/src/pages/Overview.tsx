import { useNavigate } from "react-router-dom";
import { AnalysisPipeline, STEP_ROUTES } from "../components/animations/AnalysisPipeline";
import { DecisionCard } from "../components/DecisionCard";
import { CommercialFeasibilityCard } from "../components/CommercialFeasibilityCard";
import { SpotlightCard } from "../components/layout/SpotlightCard";
import { useAnalysis } from "../state/AnalysisContext";
import { useWorkflow } from "../workflow/engine";
import { useGuidedDemo } from "../workflow/GuidedDemo";
import { transitionTo } from "../workflow/transition";

export function Overview() {
  const store = useAnalysis();
  const engine = useWorkflow();
  const guided = useGuidedDemo();
  const navigate = useNavigate();
  const sample = store.active;
  const status = !sample
    ? "Waiting for a sample"
    : sample.prediction?.available
    ? "Analyzed"
    : sample.validation
    ? "Validated"
    : "Loaded";
  const running = engine.status === "running";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Intelligent Recovery Overview
          </p>
          <h1 className="font-serif text-4xl font-medium text-ink">Waste Recovery Intelligence</h1>
          <dl className="mt-4 flex flex-wrap gap-8 text-sm">
            <div className="flex items-center gap-2">
              <dt className="text-muted">Sample:</dt>
              <dd className="font-medium text-ink">{sample?.name ?? "None"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-muted">Status:</dt>
              <dd className="font-mono text-emerald-600 font-semibold">{status}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            className="btn rounded-lg bg-ink px-4 py-2 text-xs font-mono font-medium text-white shadow-md transition-all hover:bg-black hover:scale-[1.02] disabled:opacity-50"
            type="button"
            disabled={guided.running || running}
            onClick={guided.start}
          >
            ▶ Start Guided Demo
          </button>
          <button
            className="btn rounded-lg bg-emerald-700 px-4 py-2 text-xs font-mono font-semibold text-white shadow-md transition-all hover:bg-emerald-600 hover:scale-[1.02] disabled:opacity-50"
            type="button"
            disabled={!sample || running || store.busy === "analyze"}
            onClick={() => store.analyze().catch(() => undefined)}
          >
            {running ? "Analysis running..." : "⚡ Run Analysis"}
          </button>
        </div>
      </header>

      {/* Workflow Stepper Card with Spotlight Effect */}
      <SpotlightCard as="section" spotlightColor="emerald" className="p-5">
        <div className="mb-3.5 flex items-center justify-between border-b border-white/[0.08] pb-2.5">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Pipeline Stages · Select a step to navigate
          </p>
          <span className="text-[11px] font-mono text-zinc-400">Reactive Dataflow</span>
        </div>
        <AnalysisPipeline onSelect={(id) => transitionTo(navigate, STEP_ROUTES[id])} />
        <p className="mt-3.5 text-xs text-zinc-400">
          Step states reflect real API responses for the current sample. Energy pulse beams illuminate completed pipeline pathways.
        </p>
      </SpotlightCard>

      {sample?.prediction?.available && (
        <CommercialFeasibilityCard
          oilPct={
            sample.prediction.output_map?.oil_pct ??
            sample.prediction.outputs?.find((o) => o.key === "oil_pct")?.value ??
            68.5
          }
          gasPct={
            sample.prediction.output_map?.gas_pct ??
            sample.prediction.outputs?.find((o) => o.key === "gas_pct")?.value ??
            21.0
          }
          charPct={
            sample.prediction.output_map?.char_pct ??
            sample.prediction.outputs?.find((o) => o.key === "char_pct")?.value ??
            9.5
          }
        />
      )}

      <DecisionCard
        optimization={sample?.optimization ?? null}
        sampleName={sample?.name ?? "No sample"}
        onEvidence={() => transitionTo(navigate, "/app/trust")}
        onWhatIf={() => transitionTo(navigate, "/app/simulate")}
        onReport={() => transitionTo(navigate, "/app/reports")}
      />
    </div>
  );
}
