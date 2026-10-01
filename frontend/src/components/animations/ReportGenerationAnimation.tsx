import type { ModelMeta, Sample } from "../../types";
import type { StepStatus } from "../../workflow/engine";
import { StepBadge } from "./StepBadge";
import { useStagger } from "./motion";

export function ReportGenerationAnimation({
  sample,
  model,
  status,
}: {
  sample: Sample;
  model: ModelMeta | null;
  status: StepStatus;
}) {
  const inputs: Array<{ label: string; status: StepStatus; detail: string }> = [
    { label: "Collecting sample data", status: "success", detail: `${sample.name} · ${sample.sourceLabel}` },
    sample.prediction?.available
      ? { label: "Collecting prediction", status: "success", detail: "Model estimate" }
      : { label: "Collecting prediction", status: "unavailable", detail: "No prediction yet. The report says so." },
    model
      ? { label: "Collecting model metadata", status: "success", detail: `${model.selected.model} · ${model.dataset.label}` }
      : { label: "Collecting model metadata", status: "unavailable", detail: "Model service unavailable" },
    { label: "Collecting limitations", status: "success", detail: "Limitations section is always included" },
  ];
  const active = status === "processing" || status === "success" || status === "error";
  const shown = useStagger(inputs.length, 320, active);
  const final: StepStatus = shown < inputs.length ? "idle" : status;
  return (
    <figure>
      <ol className="space-y-2" aria-live="polite">
        {inputs.map((item, index) => (
          <li key={item.label} className="flex items-start gap-3 text-sm">
            <StepBadge status={index < shown ? item.status : active && index === shown ? "processing" : "idle"} label={item.label} />
            <span>
              <span className="block">{item.label}</span>
              {index < shown ? <span className="block text-xs text-muted">{item.detail}</span> : null}
            </span>
          </li>
        ))}
        <li className="flex items-start gap-3 text-sm">
          <StepBadge status={final === "success" ? "success" : final === "error" ? "error" : final === "processing" ? "processing" : "idle"} label="Generating report" />
          <span>{final === "success" ? "Report ready" : final === "error" ? "Report failed" : "Generating report"}</span>
        </li>
      </ol>
      <figcaption className="mt-2 text-xs text-muted">The server does not report percentage progress, so none is shown.</figcaption>
    </figure>
  );
}
