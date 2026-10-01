import { MATERIAL_FIELDS, finite } from "../../format";
import type { Sample } from "../../types";
import { MATERIAL_COLORS, useCountUp, useReducedMotion } from "./motion";

function Row({ label, value, color, index }: { label: string; value: number | null; color: string; index: number }) {
  const shown = useCountUp(value, { delay: index * 160, duration: 800 });
  const reduced = useReducedMotion();
  return (
    <li className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-3 text-sm">
      <span>{label}</span>
      <span className="h-3 bg-paper2">
        {value === null ? null : (
          <span
            className="grow-bar block h-3"
            style={{ width: `${Math.min(100, value)}%`, background: color, animationDelay: reduced ? "0ms" : `${index * 160}ms` }}
          />
        )}
      </span>
      <span className="tabular text-right">{value === null ? "Missing" : `${shown.toFixed(1)}%`}</span>
    </li>
  );
}

export function CompositionAnimation({ sample }: { sample: Sample }) {
  return (
    <figure>
      <ul className="space-y-2" aria-label="Material composition">
        {MATERIAL_FIELDS.map(([key, label], index) => (
          <Row key={key} label={label} value={finite(sample.inputs[key])} color={MATERIAL_COLORS[key]} index={index} />
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-muted">Entered weight percent of the dry blend. Values are shown as supplied.</figcaption>
    </figure>
  );
}
