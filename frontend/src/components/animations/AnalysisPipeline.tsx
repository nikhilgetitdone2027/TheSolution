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
        const flowing =
          item.status === "success" &&
          (nextStatus === "processing" || nextStatus === "active");
        const focused =
          state.focus === id ||
          (state.focus === "flow" && id === "prediction") ||
          (state.focus === "best" && id === "optimization");

        const content = (
          <>
            <StepBadge status={item.status} label={STEP_LABELS[id]} />
            <span className="pipeline-text">
              <span className="pipeline-label">{STEP_LABELS[id]}</span>
              {compact ? null : (
                <span className="pipeline-detail">
                  {item.detail ?? STATUS_TEXT[item.status]}
                </span>
              )}
            </span>
          </>
        );

        return (
          <li
            key={id}
            className={`pipeline-node is-${item.status} ${focused ? "is-focus" : ""}`}
          >
            {onSelect ? (
              <button
                type="button"
                className="pipeline-card group transition-all duration-200"
                onClick={() => onSelect(id)}
              >
                {content}
              </button>
            ) : (
              <div className="pipeline-card">{content}</div>
            )}

            {/* Glowing Energy Beam Connector */}
            {next ? (
              <div
                className={`pipeline-link pipeline-energy-link ${
                  item.status === "success" ? "is-done" : ""
                } ${flowing ? "is-flowing" : ""}`}
                aria-hidden="true"
              >
                <svg
                  className="energy-beam-svg"
                  viewBox="0 0 32 6"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id={`pulse-grad-${id}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  {/* Conduit Track */}
                  <line
                    x1="0"
                    y1="3"
                    x2="32"
                    y2="3"
                    className="conduit-track"
                    strokeWidth="1.5"
                  />
                  {/* Active glowing energy pulse beam */}
                  {(item.status === "success" || flowing) && (
                    <line
                      x1="0"
                      y1="3"
                      x2="32"
                      y2="3"
                      className="conduit-pulse"
                      stroke={`url(#pulse-grad-${id})`}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <span className="pipeline-packet" />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
