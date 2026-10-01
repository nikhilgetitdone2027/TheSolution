import type { Validation } from "../../types";
import { useStagger } from "./motion";

type CheckStatus = "pass" | "fail" | "warn" | "skip" | "checking" | "pending";

const GLYPH: Record<CheckStatus, string> = { pass: "✓", fail: "✕", warn: "⚠", skip: "↷", checking: "◌", pending: "○" };
const WORD: Record<CheckStatus, string> = { pass: "passed", fail: "failed", warn: "warning", skip: "not checked", checking: "checking", pending: "pending" };

const LABELS = [
  "Required model inputs present",
  "Numeric values and 0–100% ranges",
  "Material balance checked",
  "Process parameters within training range",
  "Waste category supported by the model",
];

const MATERIALS = ["pe_pct", "pp_pct", "pet_pct", "ps_pct", "pvc_pct", "other_pct"];

function evaluate(v: Validation): Array<{ status: CheckStatus; detail: string }> {
  const rangeErrors = v.errors.filter((item) => item.field !== "material_balance");
  const balanceError = v.errors.find((item) => item.field === "material_balance");
  const balanceWarning = v.warnings.find((item) => item.field === "material_balance");
  const materialsComplete = MATERIALS.every((key) => v.parsed[key] !== null && v.parsed[key] !== undefined);
  const categoryBlocked = v.blocking_reasons.some((reason) => reason.includes("category"));
  return [
    {
      status: v.detected.required_present === v.detected.required_total ? "pass" : "fail",
      detail: `${v.detected.required_present} of ${v.detected.required_total} required variables`,
    },
    {
      status: rangeErrors.length ? "fail" : "pass",
      detail: rangeErrors.length ? rangeErrors[0]?.message ?? "Invalid value" : `${v.detected.invalid_values} invalid values`,
    },
    balanceError
      ? { status: "fail", detail: balanceError.message }
      : balanceWarning
        ? { status: "warn", detail: balanceWarning.message }
        : materialsComplete
          ? { status: "pass", detail: "Within ±1% of 100%" }
          : { status: "skip", detail: "Not checked because a material fraction is missing" },
    v.detected.extrapolation.length
      ? { status: "warn", detail: `Outside training range: ${v.detected.extrapolation.join(", ")}` }
      : { status: "pass", detail: "All model inputs inside the training range" },
    { status: categoryBlocked ? "fail" : "pass", detail: v.category.replace("_", " ") },
  ];
}

export function ValidationAnimation({ validation, running }: { validation: Validation | null | undefined; running: boolean }) {
  const results = validation ? evaluate(validation) : null;
  const shown = useStagger(LABELS.length, 420, Boolean(results));
  const done = results && shown >= LABELS.length;
  return (
    <figure>
      <ul className="space-y-2" aria-live="polite">
        {LABELS.map((label, index) => {
          const status: CheckStatus = results
            ? index < shown
              ? (results[index]?.status ?? "pending")
              : index === shown
                ? "checking"
                : "pending"
            : running
              ? "checking"
              : "pending";
          return (
            <li key={label} className={`check is-${status}`} style={{ animationDelay: `${index * 160}ms` }}>
              <span className="check-glyph" aria-hidden>
                {GLYPH[status]}
              </span>
              <span>
                <span className="block text-sm">
                  {label} <span className="sr-only">{WORD[status]}</span>
                </span>
                {results && index < shown ? <span className="block text-xs text-muted">{results[index]?.detail}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {done ? (
        validation?.prediction_allowed ? (
          <p className="mt-3 text-sm font-medium tracking-[0.12em] text-pine fade-up">✓ VALIDATION COMPLETE · quality {validation.quality_score}</p>
        ) : (
          <div className="mt-3 text-sm fade-up">
            <p className="font-medium tracking-[0.12em] text-bad">✕ VALIDATION FAILED</p>
            {validation?.blocking_reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        )
      ) : null}
      <figcaption className="mt-2 text-xs text-muted">Only checks the validation service performs are listed.</figcaption>
    </figure>
  );
}
