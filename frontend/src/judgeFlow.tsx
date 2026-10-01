import { useNavigate } from "react-router-dom";
import { useAnalysis } from "./state/AnalysisContext";

export const JUDGE_STEPS = [
  {
    title: "Opening",
    path: "/app/judge",
    copy: "This is not a waste classifier. We are building a decision engine that asks what should happen to a chemically characterized waste stream.",
  },
  {
    title: "Sample",
    path: "/app/samples",
    action: "demo" as const,
    copy: "Step 1. Load an illustrative mixed-plastic sample. The composition is entered data, not a camera reading.",
  },
  {
    title: "Composition",
    path: "/app/chemical",
    copy: "Step 2. Chemical composition. Identified polymers can be converted to elemental contributions. The Other fraction is left uncharacterized.",
  },
  {
    title: "AI",
    path: "/app",
    action: "analyze" as const,
    copy: "Step 3. Run the analysis. Validation, prediction, pathway metrics, optimization, and the explanation each wait on the service.",
  },
  {
    title: "Prediction",
    path: "/app/predictions",
    copy: "Step 4. Predicted oil, gas, char, and other products from the selected model.",
  },
  {
    title: "Pathways",
    path: "/app/pathways",
    copy: "Step 5. Compare recovery pathways. Unsupported metrics stay labeled insufficient data.",
  },
  {
    title: "Optimize",
    path: "/app/optimize",
    action: "optimize" as const,
    copy: "Step 6. Optimize inside the training range for the energy-bearing product proxy.",
  },
  {
    title: "Simulate",
    path: "/app/simulate",
    action: "simulate" as const,
    copy: "Step 7. Change temperature inside the training range and watch the model output update.",
  },
  {
    title: "Explain",
    path: "/app/predictions",
    action: "explain" as const,
    copy: "Step 8. The explanation cites feature importance and a local model response. It does not invent a mechanism.",
  },
  {
    title: "Impact",
    path: "/app/reports",
    action: "report" as const,
    copy: "Step 9. Generate the impact report. CHEM2ENERGY converts waste composition into actionable recovery intelligence.",
  },
];

export function useJudgeAdvance() {
  const store = useAnalysis();
  const navigate = useNavigate();

  async function next() {
    const upcoming = store.judgeStep + 1;
    const item = JUDGE_STEPS[upcoming];
    if (!item) return;
    try {
      if (item.action === "demo") await store.loadDemo("A");
      if (item.action === "analyze") await store.analyze("energy_recovery");
      if (item.action === "optimize") await store.optimize("energy_recovery");
      if (item.action === "simulate") {
        const range = store.model?.optimization_boundary.ranges.temperature_c;
        const temperature = range ? range.min + (range.max - range.min) * 0.8 : 500;
        await store.simulate({ temperature_c: Number(temperature.toFixed(2)) });
      }
      if (item.action === "explain") await store.ask("Why did the model produce this product distribution?");
      if (item.action === "report") await store.createReport();
      store.setJudge(true, upcoming);
      navigate(item.path);
    } catch {
      store.setJudge(true, store.judgeStep);
    }
  }

  return { next, step: JUDGE_STEPS[store.judgeActive ? store.judgeStep : 0] };
}
