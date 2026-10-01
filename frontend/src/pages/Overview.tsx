import { useNavigate } from "react-router-dom";
import { AnalysisPipeline, STEP_ROUTES } from "../components/animations/AnalysisPipeline";
import { DecisionCard } from "../components/DecisionCard";
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
  const status = !sample ? "Waiting for a sample" : sample.prediction?.available ? "Analyzed" : sample.validation ? "Validated" : "Loaded";
  const running = engine.status === "running";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Overview</p>
          <h1 className="font-serif text-4xl font-medium">Waste Recovery Intelligence</h1>
          <dl className="mt-4 flex flex-wrap gap-8 text-sm">
            <div>
              <dt className="text-muted">Sample</dt>
              <dd>{sample?.name ?? "None"}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd>{status}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn bg-ink px-4 py-2 text-sm text-white disabled:opacity-50" type="button" disabled={guided.running || running} onClick={guided.start}>
            ▶ Start Guided Demo
          </button>
          <button
            className="btn bg-pine px-4 py-2 text-sm text-white disabled:opacity-50"
            type="button"
            disabled={!sample || running || store.busy === "analyze"}
            onClick={() => store.analyze().catch(() => undefined)}
          >
            {running ? "Analysis running" : "Run analysis"}
          </button>
        </div>
      </header>

      <section className="border border-line bg-surface p-4">
        <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">Workflow · select a step to open it</p>
        <AnalysisPipeline onSelect={(id) => transitionTo(navigate, STEP_ROUTES[id])} />
        <p className="mt-3 text-xs text-muted">Step states reflect the real API responses for the current sample. Nothing is marked complete before the backend returns.</p>
      </section>

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
