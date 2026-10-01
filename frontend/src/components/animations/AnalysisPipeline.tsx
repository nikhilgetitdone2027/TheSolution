import { STEP_ORDER, useWorkflow, type StepId } from "../../workflow/engine";
import { STATUS_TEXT, StepBadge } from "./StepBadge";

export const STEP_LABELS: Record<StepId, string> = {
  sample: "Sample",
  composition: "Composition",
  validation: "Validation",
  ml: "ML engine",
  prediction: "Prediction",
  explanation: "Explanation",
  optimization: "Optimizer",
  simulation: "What-If",
  impact: "Impact / limits",
  report: "Report",
};

export const STEP_ROUTES: Record<StepId, string> = {
  sample: "/app/samples",
  composition: "/app/chemical",
  validation: "/app/samples",
  ml: "/app/predictions",
  prediction: "/app/predictions",
  explanation: "/app/predictions",
  optimization: "/app/optimize",
  simulation: "/app/simulate",
  impact: "/app/impact",
  report: "/app/reports",
};

export function AnalysisPipeline({
  compact = false,
  steps = STEP_ORDER,
  onSelect,
}: {
  compact?: boolean;
  steps?: StepId[];
  onSelect?: (id: StepId) => void;
}) {
  const state = useWorkflow();
  return (
    <ol className={`pipeline ${compact ? "is-compact" : ""}`} aria-label="Analysis pipeline">
      {steps.map((id, index) => {
        const item = state.steps[id];
        const next = steps[index + 1];
        const nextStatus = next ? state.steps[next].status : null;
        const flowing = item.status === "success" && (nextStatus === "processing" || nextStatus === "active");
        const focused = state.focus === id || (state.focus === "flow" && id === "prediction") || (state.focus === "best" && id === "optimization");
        const content = (
          <>
            <StepBadge status={item.status} label={STEP_LABELS[id]} />
            <span className="pipeline-text">
              <span className="pipeline-label">{STEP_LABELS[id]}</span>
              {compact ? null : <span className="pipeline-detail">{item.detail ?? STATUS_TEXT[item.status]}</span>}
            </span>
          </>
        );
        return (
          <li key={id} className={`pipeline-node is-${item.status} ${focused ? "is-focus" : ""}`}>
            {onSelect ? (
              <button type="button" className="pipeline-card" onClick={() => onSelect(id)}>
                {content}
              </button>
            ) : (
              <div className="pipeline-card">{content}</div>
            )}
            {next ? (
              <span className={`pipeline-link ${item.status === "success" ? "is-done" : ""} ${flowing ? "is-flowing" : ""}`} aria-hidden>
                <span className="pipeline-packet" />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
