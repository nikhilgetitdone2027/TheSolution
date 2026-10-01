import { MATERIAL_FIELDS, finite } from "../../format";
import type { Sample } from "../../types";
import { MATERIAL_COLORS } from "./motion";

export function SampleFlowAnimation({ sample }: { sample: Sample }) {
  const parts = MATERIAL_FIELDS.map(([key, label]) => ({ key, label, value: finite(sample.inputs[key]) })).filter(
    (part): part is { key: (typeof MATERIAL_FIELDS)[number][0]; label: (typeof MATERIAL_FIELDS)[number][1]; value: number } =>
      part.value !== null && part.value > 0,
  );
  return (
    <figure className="sample-flow">
      <div className="sample-card">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Waste sample</p>
        <p className="font-serif text-lg">{sample.name}</p>
        <p className="text-xs text-muted">{sample.sourceLabel}</p>
      </div>
      <div className="sample-split" aria-hidden />
      <ul className="sample-fragments">
        {parts.map((part, index) => (
          <li
            key={part.key}
            className="sample-fragment"
            style={{
              animationDelay: `${index * 140}ms`,
              flexGrow: Math.max(part.value, 3),
              background: MATERIAL_COLORS[part.key],
            }}
          >
            <span>{part.label}</span>
            <span className="tabular">{part.value.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-2 text-xs text-muted">
        Fragment widths follow the entered material fractions. {parts.length ? "" : "No material fractions were entered."}
      </figcaption>
    </figure>
  );
}
