import type { Evidence, SaathiAction } from "../schemas/types.js";
import type { Intent } from "../actions/intent.js";

const NAVIGATION: Partial<Record<Intent, SaathiAction>> = {
  pyrolysis: { type: "navigate", page: "pathways" },
  temperature: { type: "navigate", page: "what_if_lab" },
  compare: { type: "navigate", page: "what_if_lab" },
  parameter: { type: "navigate", page: "what_if_lab" },
  composition: { type: "navigate", page: "chemical" },
  pvc: { type: "navigate", page: "chemical" },
  carbon: { type: "navigate", page: "carbon" },
  impact: { type: "navigate", page: "impact" },
  model: { type: "navigate", page: "trust" },
  objective: { type: "navigate", page: "optimize" },
  alternatives: { type: "navigate", page: "optimize" },
  assumptions: { type: "navigate", page: "optimize" },
  prediction: { type: "navigate", page: "predictions" },
  importance: { type: "navigate", page: "predictions" },
  summarize: { type: "navigate", page: "predictions" },
};

const ALLOWED = new Set(["navigate", "run_analysis"]);

export function selectTools(intent: Intent, evidence: Evidence): { toolsUsed: string[]; actions: SaathiAction[] } {
  const tools = new Set<string>(["getCurrentSample"]);
  if (evidence.model) tools.add("getModelMetrics");
  if (intent === "composition" || intent === "pvc" || intent === "carbon" || intent === "measured") tools.add("getChemicalProfile");
  if (intent === "prediction" || intent === "summarize" || intent === "oil" || intent === "analyze") tools.add("getPrediction");
  if (intent === "importance" || intent === "oil" || intent === "summarize" || intent === "pyrolysis") tools.add("getFeatureImportance");
  if (intent === "pyrolysis" || intent === "impact") tools.add("getPathwayComparison");
  if (intent === "objective" || intent === "assumptions" || intent === "alternatives" || intent === "temperature") {
    tools.add("getOptimizationResult");
  }
  if (intent === "compare" || intent === "temperature") tools.add("getSimulationResult");
  if (intent === "carbon" || intent === "impact" || intent === "measured") tools.add("getCarbonProfile");
  if (intent === "quality") tools.add("getCurrentSample");
  if (intent === "limitations" || intent === "model" || intent === "unknown") tools.add("getProjectKnowledge");

  const actions: SaathiAction[] = [];
  if (intent === "analyze") {
    tools.add("runAnalysis");
    if (evidence.sample) actions.push({ type: "run_analysis" });
  }
  const navigation = NAVIGATION[intent];
  if (navigation && evidence.sample) {
    const page = navigation.type === "navigate" && navigation.page === "what_if_lab" && !evidence.sample.optimization?.available
      ? "optimize"
      : navigation.type === "navigate"
        ? navigation.page
        : null;
    if (page) {
      tools.add(page === "what_if_lab" ? "openWhatIfLab" : "navigateTo");
      actions.push({ type: "navigate", page });
    }
  }
  return {
    toolsUsed: [...tools].filter((name) => ALLOWED.has(name) || !name.startsWith("_")),
    actions: actions.filter((action) => ALLOWED.has(action.type)),
  };
}
