import type { ImportanceRow } from "../../types";
import { useReducedMotion, useStagger } from "./motion";

export function FeatureImportanceAnimation({ rows, limit = 6 }: { rows: ImportanceRow[]; limit?: number }) {
  const reduced = useReducedMotion();
  const ranked = [...rows].sort((a, b) => b.mean_mae_increase - a.mean_mae_increase).slice(0, limit);
  const max = Math.max(...ranked.map((row) => row.mean_mae_increase), 1e-9);
  const shown = useStagger(ranked.length, 260);
  if (!ranked.length) return <p className="text-sm">Feature importance is not available for this sample.</p>;
  return (
    <figure>
      <p className="mb-3 inline-block border border-line px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">Permutation importance</p>
      <ol className="space-y-2">
        {ranked.map((row, index) => (
          <li key={row.feature} className={`grid grid-cols-[1.5rem_8rem_1fr_5rem] items-center gap-2 text-sm transition-opacity duration-300 ${index < shown ? "opacity-100" : "opacity-0"}`}>
            <span className="font-mono text-xs text-muted">{index + 1}</span>
            <span className="truncate">{row.label}</span>
            <span className="h-2.5 bg-paper2">
              {index < shown ? (
                <span className="grow-bar block h-2.5 bg-slate" style={{ width: `${Math.max(1, (Math.max(0, row.mean_mae_increase) / max) * 100)}%`, animationDuration: reduced ? "0ms" : undefined }} />
              ) : null}
            </span>
            <span className="tabular text-right text-xs">+{row.mean_mae_increase.toFixed(3)} MAE</span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 text-xs leading-5 text-muted">
        This indicates how much model performance changes when a feature is permuted. It does not establish physical causation.
      </figcaption>
    </figure>
  );
}
