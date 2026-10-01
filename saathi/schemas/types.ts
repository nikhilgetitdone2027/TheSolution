export type Language = "en" | "hi" | "hinglish";
export type LanguagePreference = "auto" | Language;

export const PAGES = [
  "overview",
  "samples",
  "chemical",
  "predictions",
  "pathways",
  "optimize",
  "what_if_lab",
  "carbon",
  "impact",
  "reports",
  "trust",
  "judge",
  "settings",
  "unknown",
] as const;

export type PageId = (typeof PAGES)[number];

export type SaathiAction = { type: "navigate"; page: Exclude<PageId, "unknown"> } | { type: "run_analysis" };

export type OutputFact = {
  key: string;
  label: string;
  value: number;
  unit: string;
  kind: string | null;
};

export type ImportanceFact = {
  label: string;
  meanMaeIncrease: number;
};

export type RangeFact = {
  key: string;
  label: string;
  min: number;
  max: number;
  unit: string;
};

export type PathwayFact = {
  id: string;
  name: string;
  summary: string;
  limitations: string[];
  unavailable: string[];
};

export type LocalEffectFact = {
  label: string;
  from: number;
  to: number;
  unit: string;
  oilDelta: number | null;
};

export type SampleFacts = {
  id: string;
  name: string;
  sourceLabel: string;
  category: string;
  inputs: Record<string, number | null>;
  qualityScore: number | null;
  predictionAllowed: boolean | null;
  blocking: string[];
  optionalMissing: string[];
  prediction: {
    available: boolean;
    disclaimer: string | null;
    illustrative: boolean;
    model: string | null;
    outputs: OutputFact[];
  } | null;
  optimization: {
    available: boolean;
    objective: string | null;
    proxy: string | null;
    proxyNote: string | null;
    reason: string | null;
    evaluated: number | null;
    score: number | null;
    scoreUnit: string | null;
    configuration: Record<string, number>;
    top: Array<{ configuration: Record<string, number>; score: number }>;
    statement: string | null;
  } | null;
  pathways: PathwayFact[];
  decisionStatement: string | null;
  heating: { available: boolean; value: number | null; reason: string | null; kind: string | null } | null;
  carbonStatus: string | null;
  elements: Record<string, number> | null;
  uncharacterized: number | null;
  elementalNote: string | null;
  importance: ImportanceFact[];
  localEffects: LocalEffectFact[];
};

export type ModelFacts = {
  name: string | null;
  reason: string | null;
  datasetLabel: string | null;
  datasetNature: string | null;
  disclaimer: string | null;
  holdout: { mae: number; rmse: number; r2: number } | null;
  perTarget: Array<{ label: string; r2: number; mae: number }>;
  importanceMethod: string | null;
  importance: ImportanceFact[];
  ranges: RangeFact[];
  supportsSpread: boolean;
  intendedUse: string | null;
  nonIntendedUse: string | null;
};

export type SimulationFacts = {
  before: Record<string, number>;
  after: Record<string, number>;
  changes: Array<{ key: string; label: string; from: number; to: number; unit: string }>;
};

export type Evidence = {
  page: PageId;
  sample: SampleFacts | null;
  model: ModelFacts | null;
  simulation: SimulationFacts | null;
  docs: string[];
};

export type TurnResult = {
  text: string;
  language: Language;
  actions: SaathiAction[];
  toolsUsed: string[];
  interpreter: string;
};
