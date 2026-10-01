import { MATERIAL_FIELDS, finite } from "../../format";
import type { Sample, Validation } from "../../types";
import { MATERIAL_COLORS, useCountUp } from "./motion";

const R = 54;
const C = 2 * Math.PI * R;

export function MaterialBalance({ sample, validation }: { sample: Sample; validation?: Validation | null }) {
  const parts = MATERIAL_FIELDS.map(([key, label]) => ({ key, label, value: finite(sample.inputs[key]) }));
  const missing = parts.filter((part) => part.value === null).map((part) => part.label);
  const sum = parts.reduce((total, part) => total + (part.value ?? 0), 0);
  const shownSum = useCountUp(sum, { duration: 1400, delay: 300 });
  const backendError = validation?.errors.find((item) => item.field === "material_balance");
  const backendWarning = validation?.warnings.find((item) => item.field === "material_balance");
  const valid = !missing.length && Math.abs(sum - 100) <= 1 && !backendError;
  const status = missing.length ? "incomplete" : valid ? "valid" : "invalid";

  let cursor = 0;
  const segments = parts
    .filter((part) => (part.value ?? 0) > 0)
    .map((part, index) => {
      const start = cursor;
      cursor += part.value ?? 0;
      return { ...part, start, index };
    });

  return (
    <figure className={`balance is-${status}`}>
      <svg viewBox="0 0 140 140" className="balance-ring" role="img" aria-label={`Material fractions sum to ${sum.toFixed(1)} percent`}>
        <circle cx="70" cy="70" r={R} className="balance-track" />
        {segments.map((segment) => {
          const inside = Math.max(0, Math.min(segment.value ?? 0, 100 - segment.start));
          const overflow = Math.max(0, (segment.value ?? 0) - inside);
          return (
            <g key={segment.key}>
              {inside > 0 ? (
                <circle
                  cx="70"
                  cy="70"
                  r={R}
                  className="balance-seg"
                  stroke={MATERIAL_COLORS[segment.key]}
                  style={{
                    strokeDasharray: `${(inside / 100) * C} ${C}`,
                    transform: `rotate(${(segment.start / 100) * 360 - 90}deg)`,
                    animationDelay: `${segment.index * 180}ms`,
                  }}
                />
              ) : null}
              {overflow > 0 ? (
                <circle
                  cx="70"
                  cy="70"
                  r={R + 9}
                  className="balance-overflow"
                  style={{
                    strokeDasharray: `${(overflow / 100) * 2 * Math.PI * (R + 9)} ${2 * Math.PI * (R + 9)}`,
                    transform: `rotate(${((Math.max(segment.start, 100) - 100) / 100) * 360 - 90}deg)`,
                    animationDelay: `${segment.index * 180 + 200}ms`,
                  }}
                />
              ) : null}
            </g>
          );
        })}
        <text x="70" y="68" textAnchor="middle" className="balance-value">
          {shownSum.toFixed(1)}%
        </text>
        <text x="70" y="86" textAnchor="middle" className="balance-caption">
          of 100% expected
        </text>
      </svg>
      <figcaption className="text-sm" aria-live="polite">
        {status === "valid" ? (
          <p className="font-medium text-pine">✓ Material balance {validation ? "validated" : "sums to 100% (awaiting server check)"}</p>
        ) : status === "invalid" ? (
          <>
            <p className="font-medium text-bad">✕ Material balance invalid</p>
            <p>100% expected, {sum.toFixed(1)}% received. The input is not corrected.</p>
          </>
        ) : (
          <p className="font-medium text-warn">— Balance not checked. Missing: {missing.join(", ")}.</p>
        )}
        {backendWarning ? <p className="mt-1 text-muted">{backendWarning.message}</p> : null}
        <p className="mt-1 text-xs text-muted">Calculated from the entered fractions.</p>
      </figcaption>
    </figure>
  );
}
