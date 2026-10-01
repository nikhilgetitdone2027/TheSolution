import type { StepStatus } from "../../workflow/engine";

const GLYPH: Record<StepStatus, string> = {
  idle: "○",
  active: "◉",
  processing: "◌",
  success: "✓",
  error: "✕",
  skipped: "↷",
  unavailable: "—",
};

export const STATUS_TEXT: Record<StepStatus, string> = {
  idle: "Waiting",
  active: "Next",
  processing: "In progress",
  success: "Complete",
  error: "Failed",
  skipped: "Skipped",
  unavailable: "Unavailable",
};

export function StepBadge({ status, label }: { status: StepStatus; label?: string }) {
  return (
    <span className={`step-badge is-${status}`} aria-label={`${label ? `${label}: ` : ""}${STATUS_TEXT[status]}`}>
      <span aria-hidden>{GLYPH[status]}</span>
    </span>
  );
}
