import type { ModelMeta, Sample } from "../../types";
import { useStagger } from "./motion";

type Category = { id: "measured" | "predicted" | "calculated" | "illustrative"; title: string; items: string[] };

export function TrustCenterAnimation({ sample, model }: { sample: Sample | null; model: ModelMeta | null }) {
  const predicted = sample?.prediction?.available
    ? (sample.prediction.outputs ?? []).map((item) => `${item.label} ${item.value.toFixed(1)}%`)
    : ["No prediction for the current sample yet"];
  const calculated: string[] = [];
  if (sample) calculated.push("Material balance (sum of entered fractions)");
  if (sample) calculated.push("Theoretical polymer elemental contribution");
  if (sample?.flows?.available) calculated.push("Product mass flow (feed rate × model fraction)");
  if (sample?.pathways?.heating_value.available) calculated.push("Feedstock heating value (Dulong estimate)");
  const categories: Category[] = [
    {
      id: "measured",
      title: "Measured",
      items: ["No laboratory dataset is currently connected.", sample ? "Sample composition is entered data. This system did not measure it." : "No sample loaded."],
    },
    { id: "predicted", title: "Predicted", items: predicted },
    { id: "calculated", title: "Calculated", items: calculated.length ? calculated : ["Nothing calculated yet"] },
    {
      id: "illustrative",
      title: "Illustrative",
      items: [model?.dataset.label ?? "Training dataset label unavailable", model ? `${model.dataset.rows} rows used to train ${model.selected.model}` : "Model metadata unavailable"],
    },
  ];
  const shown = useStagger(categories.length, 300);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {categories.map((category, index) => (
        <article key={category.id} className={`trust-card is-${category.id} ${index < shown ? "is-visible" : ""}`}>
          <p className="trust-tag">{category.title}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {category.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
