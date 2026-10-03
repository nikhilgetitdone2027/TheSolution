import type { StepStatus } from "../../workflow/engine";

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
    <span
      className={`step-badge relative inline-flex items-center justify-center is-${status}`}
      aria-label={`${label ? `${label}: ` : ""}${STATUS_TEXT[status]}`}
    >
      {/* Active node: subtle breathing pulse ring animation */}
      {status === "active" && (
        <span
          className="pointer-events-none absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping opacity-75"
          style={{ animationDuration: "2.4s" }}
          aria-hidden="true"
        />
      )}

      {/* Real-time processing indicator: rotating dashed circular border */}
      {status === "processing" && (
        <svg
          className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] animate-spin"
          style={{ animationDuration: "2.8s" }}
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="14"
            cy="14"
            r="12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="5 4"
            className="text-emerald-400"
          />
        </svg>
      )}

      {/* Status Icons */}
      <span className="step-badge-glyph z-10 flex items-center justify-center" aria-hidden="true">
        {status === "success" ? (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.5L4.8 8.8L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : status === "active" ? (
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        ) : status === "processing" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        ) : status === "error" ? (
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : status === "skipped" || status === "unavailable" ? (
          <span className="text-[10px] leading-none">—</span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-line/80" />
        )}
      </span>
    </span>
  );
}
