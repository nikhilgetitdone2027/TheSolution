import type { Prediction } from "../../types";
import { OUTPUT_COLORS, useCountUp, useStagger } from "./motion";

function Figure({ label, value, color, visible }: { label: string; value: number; color: string; visible: boolean }) {
  const shown = useCountUp(value, { play: visible, duration: 900 });
  return (
    <li className={`reveal-card ${visible ? "is-visible" : ""}`} style={{ borderColor: visible ? color : undefined }}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="tabular font-serif text-3xl">{visible ? `${shown.toFixed(1)}%` : "…"}</span>
    </li>
  );
}

export function PredictionReveal({ prediction }: { prediction: Prediction }) {
  const outputs = prediction.outputs ?? [];
  const shown = useStagger(outputs.length + 1, 650);
  return (
    <figure>
      <ol className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-live="polite">
        {outputs.map((item, index) => (
          <Figure key={item.key} label={item.label} value={item.value} color={OUTPUT_COLORS[item.key] ?? "#1f4d38"} visible={index < shown} />
        ))}
      </ol>
      <div className={`mt-4 flex h-5 overflow-hidden bg-paper2 transition-opacity duration-500 ${shown > outputs.length ? "opacity-100" : "opacity-0"}`} aria-hidden>
        {outputs.map((item) => (
          <span key={item.key} className="grow-x h-5" style={{ width: `${item.value}%`, background: OUTPUT_COLORS[item.key] ?? "#1f4d38" }} />
        ))}
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        {prediction.disclaimer ?? "Model estimate. Not a laboratory measurement."} Values come from the prediction response.
      </figcaption>
    </figure>
  );
}
