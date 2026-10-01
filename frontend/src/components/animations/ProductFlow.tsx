import type { Prediction } from "../../types";
import { OUTPUT_COLORS, useReducedMotion } from "./motion";

export function ProductFlow({ prediction }: { prediction: Prediction }) {
  const reduced = useReducedMotion();
  const outputs = prediction.outputs ?? [];
  const height = 220;
  const total = outputs.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 40;
  const lanes = outputs.map((item, index) => {
    const width = Math.max(2, (item.value / total) * 120);
    const startY = cursor + width / 2;
    cursor += width;
    const endY = 26 + index * ((height - 52) / Math.max(1, outputs.length - 1));
    return { ...item, width, startY, endY, index };
  });
  return (
    <figure className="overflow-x-auto">
      <svg viewBox={`0 0 520 ${height}`} className="product-flow min-w-[440px]" role="img" aria-label={`Model-estimated product distribution: ${outputs.map((item) => `${item.label} ${item.value.toFixed(1)} percent`).join(", ")}`}>
        <rect x="16" y="40" width="70" height="120" rx="6" className="flow-source" />
        <text x="51" y="104" textAnchor="middle" className="flow-source-text">
          Waste
        </text>
        {lanes.map((lane) => {
          const path = `M86 ${lane.startY} C 230 ${lane.startY}, 260 ${lane.endY}, 380 ${lane.endY}`;
          const color = OUTPUT_COLORS[lane.key] ?? "#1f4d38";
          const particles = Math.max(1, Math.round(lane.value / 12));
          return (
            <g key={lane.key}>
              <path d={path} stroke={color} strokeWidth={lane.width} className="flow-lane" style={{ animationDelay: `${lane.index * 200}ms` }} />
              {!reduced
                ? Array.from({ length: particles }, (_, particle) => (
                    <circle key={particle} r="2.4" className="flow-particle">
                      <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${(particle / particles) * 2.6}s`} path={path} />
                    </circle>
                  ))
                : null}
              <text x="388" y={lane.endY + 4} className="flow-label">
                {lane.label} {lane.value.toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-muted">
        Model-estimated product distribution. Lane widths follow the predicted percentages. This is not a physical process simulation.
      </figcaption>
    </figure>
  );
}
