import { finite } from "../../format";
import type { Prediction, Sample } from "../../types";
import { FEATURE_LABELS, OUTPUT_COLORS, useReducedMotion } from "./motion";

const OUTPUTS = [
  ["oil_pct", "Oil"],
  ["gas_pct", "Gas"],
  ["char_pct", "Char"],
  ["other_product_pct", "Other"],
] as const;

export function MLInferenceAnimation({
  features,
  sample,
  modelName,
  prediction,
  running,
}: {
  features: string[];
  sample: Sample;
  modelName: string;
  prediction: Prediction | null | undefined;
  running: boolean;
}) {
  const reduced = useReducedMotion();
  const done = Boolean(prediction?.available);
  const height = Math.max(220, features.length * 24 + 20);
  const rowY = (index: number) => 20 + index * ((height - 40) / Math.max(1, features.length - 1));
  const outY = (index: number) => height / 2 - 72 + index * 48;
  const box = { x: 250, y: height / 2 - 50, w: 120, h: 100 };
  return (
    <figure className="overflow-x-auto">
      <svg viewBox={`0 0 560 ${height}`} className="ml-engine min-w-[520px]" role="img" aria-label={`Model inputs flowing into ${modelName}${done ? " and producing four outputs" : ""}`}>
        {features.map((feature, index) => {
          const y = rowY(index);
          const path = `M112 ${y} C 190 ${y}, 200 ${height / 2}, ${box.x} ${height / 2}`;
          const value = finite(sample.inputs[feature]);
          return (
            <g key={feature}>
              <text x="4" y={y + 4} className="ml-label">
                {FEATURE_LABELS[feature] ?? feature}
              </text>
              <text x="108" y={y + 4} textAnchor="end" className="ml-value">
                {value === null ? "—" : value.toFixed(1)}
              </text>
              <path id={`in-${feature}`} d={path} className={`ml-wire ${done ? "is-done" : ""}`} />
              {running && !reduced ? (
                <circle r="2.6" className="ml-particle">
                  <animateMotion dur="1.4s" repeatCount="indefinite" begin={`${index * 0.13}s`} path={path} />
                </circle>
              ) : null}
            </g>
          );
        })}
        <g className={`ml-box ${running ? "is-running" : ""} ${done ? "is-done" : ""}`}>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="10" />
          <text x={box.x + box.w / 2} y={box.y + 44} textAnchor="middle" className="ml-box-title">
            ML MODEL
          </text>
          <text x={box.x + box.w / 2} y={box.y + 64} textAnchor="middle" className="ml-box-sub">
            {modelName}
          </text>
        </g>
        {OUTPUTS.map(([key, label], index) => {
          const y = outY(index);
          const path = `M${box.x + box.w} ${height / 2} C 420 ${height / 2}, 420 ${y}, 470 ${y}`;
          const value = prediction?.output_map?.[key];
          return (
            <g key={key}>
              <path d={path} className={`ml-wire ${done ? "is-done" : ""}`} />
              {done && !reduced ? (
                <circle r="3" fill={OUTPUT_COLORS[key]}>
                  <animateMotion dur="1.2s" repeatCount="indefinite" begin={`${index * 0.2}s`} path={path} />
                </circle>
              ) : null}
              <g className={`ml-out ${done ? "is-lit" : ""}`} style={{ transitionDelay: `${index * 180}ms` }}>
                <rect x="472" y={y - 14} width="84" height="28" rx="6" fill={done ? OUTPUT_COLORS[key] : "transparent"} />
                <text x="514" y={y + 4} textAnchor="middle" className="ml-out-text">
                  {label}
                  {done && value !== undefined ? ` ${value.toFixed(1)}%` : ""}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-muted">
        {running ? "Sending the supported inputs to the trained model." : done ? "The model returned a product distribution. These are model estimates." : "Inputs used by the trained model."}
        {" "}Input values are the entered sample values.
      </figcaption>
    </figure>
  );
}
