import type {
  ImportanceFact,
  LocalEffectFact,
  ModelFacts,
  OutputFact,
  PathwayFact,
  RangeFact,
  SampleFacts,
  SimulationFacts,
} from "../schemas/types.js";

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function importanceRows(value: unknown): ImportanceFact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = record(item);
      if (!row) return null;
      const label = text(row.label);
      const mean = num(row.mean_mae_increase);
      if (!label || mean === null) return null;
      return { label, meanMaeIncrease: mean };
    })
    .filter((item): item is ImportanceFact => item !== null)
    .sort((a, b) => b.meanMaeIncrease - a.meanMaeIncrease);
}

function outputs(value: unknown): OutputFact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = record(item);
      if (!row) return null;
      const key = text(row.key);
      const label = text(row.label);
      const amount = num(row.value);
      if (!key || !label || amount === null) return null;
      return { key, label, value: amount, unit: text(row.unit) ?? "%", kind: text(row.kind) };
    })
    .filter((item): item is OutputFact => item !== null);
}

function pathways(value: unknown): PathwayFact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = record(item);
      if (!row) return null;
      const name = text(row.name);
      const id = text(row.id);
      if (!name || !id) return null;
      const metrics = Array.isArray(row.metrics) ? row.metrics : [];
      const unavailable = metrics
        .map((metric) => record(metric))
        .filter((metric): metric is Record<string, unknown> => Boolean(metric && metric.available === false))
        .map((metric) => {
          const metricName = text(metric.name) ?? "Metric";
          const reason = text(metric.reason);
          return reason ? `${metricName}: ${reason}` : metricName;
        });
      return {
        id,
        name,
        summary: text(row.summary) ?? "",
        limitations: strings(row.limitations),
        unavailable,
      };
    })
    .filter((item): item is PathwayFact => item !== null);
}

function chemistry(source: Record<string, unknown> | null): Pick<
  SampleFacts,
  "heating" | "carbonStatus" | "elements" | "uncharacterized" | "elementalNote" | "pathways" | "decisionStatement"
> {
  const empty = {
    heating: null,
    carbonStatus: null,
    elements: null,
    uncharacterized: null,
    elementalNote: null,
    pathways: [] as PathwayFact[],
    decisionStatement: null,
  };
  if (!source) return empty;
  const elemental = record(source.elemental);
  const calculated = record(elemental?.calculated);
  const heating = record(source.heating_value);
  const elements = record(calculated?.elements_wt_pct);
  const numericElements: Record<string, number> = {};
  if (elements) {
    for (const [key, value] of Object.entries(elements)) {
      const amount = num(value);
      if (amount !== null) numericElements[key] = amount;
    }
  }
  return {
    heating: heating
      ? {
          available: heating.available === true,
          value: num(heating.value_mj_per_kg),
          reason: text(heating.reason),
          kind: text(heating.kind),
        }
      : null,
    carbonStatus: text(elemental?.carbon_fraction_status),
    elements: Object.keys(numericElements).length ? numericElements : null,
    uncharacterized: num(calculated?.uncharacterized_mass_pct),
    elementalNote: text(calculated?.note),
    pathways: pathways(source.pathways),
    decisionStatement: null,
  };
}

export function readSample(raw: unknown, profile: unknown): SampleFacts | null {
  const sample = record(raw);
  if (!sample || typeof sample.id !== "string") return null;
  const validation = record(sample.validation);
  const detected = record(validation?.detected);
  const prediction = record(sample.prediction);
  const optimization = record(sample.optimization);
  const best = record(optimization?.best);
  const decision = record(optimization?.decision);
  const explanation = record(sample.explanation);
  const storedPathways = record(sample.pathways);
  const profileRecord = record(profile);
  const fromPathways = chemistry(storedPathways);
  const fromProfile = chemistry(profileRecord);
  const chemistrySource = storedPathways ? fromPathways : fromProfile;
  const inputs: Record<string, number | null> = {};
  const rawInputs = record(sample.inputs) ?? {};
  for (const [key, value] of Object.entries(rawInputs)) {
    inputs[key] = num(value);
  }
  const local = Array.isArray(explanation?.local_effects) ? explanation.local_effects : explanation?.localEffects;
  const localEffects: LocalEffectFact[] = Array.isArray(local)
    ? local
        .map((item) => {
          const row = record(item);
          if (!row) return null;
          const label = text(row.label);
          const from = num(row.from);
          const to = num(row.to);
          if (!label || from === null || to === null) return null;
          const deltas = record(row.output_delta_percentage_points);
          return {
            label,
            from,
            to,
            unit: text(row.unit) ?? "",
            oilDelta: num(deltas?.oil_pct),
          };
        })
        .filter((item): item is LocalEffectFact => item !== null)
    : [];

  return {
    id: sample.id,
    name: text(sample.name) ?? "Current sample",
    sourceLabel: text(sample.sourceLabel) ?? text(sample.source_label) ?? "",
    category: text(sample.category) ?? "",
    inputs,
    qualityScore: num(validation?.quality_score),
    predictionAllowed: typeof validation?.prediction_allowed === "boolean" ? validation.prediction_allowed : null,
    blocking: strings(validation?.blocking_reasons),
    optionalMissing: strings(detected?.optional_missing),
    prediction: prediction
      ? {
          available: prediction.available === true,
          disclaimer: text(prediction.disclaimer),
          illustrative: prediction.illustrative === true,
          model: text(prediction.model),
          outputs: outputs(prediction.outputs),
        }
      : null,
    optimization: optimization
      ? {
          available: optimization.available === true,
          objective: text(optimization.objective),
          proxy: text(optimization.proxy),
          proxyNote: text(optimization.proxy_note),
          reason: text(optimization.reason),
          evaluated: num(optimization.evaluated),
          score: num(best?.score),
          scoreUnit: text(best?.score_unit),
          configuration: Object.fromEntries(
            Object.entries(record(best?.configuration) ?? {})
              .map(([key, value]) => [key, num(value)] as const)
              .filter((entry): entry is [string, number] => entry[1] !== null),
          ),
          top: (Array.isArray(optimization.top) ? optimization.top : []).flatMap((item) => {
            const candidate = record(item);
            const score = num(candidate?.score);
            if (!candidate || score === null) return [];
            const configuration = Object.fromEntries(
              Object.entries(record(candidate.configuration) ?? {})
                .map(([key, value]) => [key, num(value)] as const)
                .filter((entry): entry is [string, number] => entry[1] !== null),
            );
            return [{ configuration, score }];
          }),
          statement: text(decision?.statement),
        }
      : null,
    pathways: chemistrySource.pathways,
    decisionStatement: text(decision?.statement),
    heating: chemistrySource.heating,
    carbonStatus: chemistrySource.carbonStatus,
    elements: chemistrySource.elements,
    uncharacterized: chemistrySource.uncharacterized,
    elementalNote: chemistrySource.elementalNote,
    importance: importanceRows(explanation?.importance),
    localEffects,
  };
}

export function readModel(raw: unknown): ModelFacts | null {
  const model = record(raw);
  if (!model) return null;
  const selected = record(model.selected);
  const dataset = record(model.dataset);
  const holdout = record(model.holdout_metrics);
  const per = record(holdout?.per_target);
  const importance = record(model.feature_importance);
  const boundary = record(model.optimization_boundary);
  const ranges = record(boundary?.ranges) ?? {};
  const perTarget = per
    ? Object.values(per)
        .map((item) => {
          const row = record(item);
          if (!row) return null;
          const label = text(row.label);
          const r2 = num(row.r2);
          const mae = num(row.mae);
          if (!label || r2 === null || mae === null) return null;
          return { label, r2, mae };
        })
        .filter((item): item is { label: string; r2: number; mae: number } => item !== null)
    : [];
  const rangeFacts: RangeFact[] = Object.entries(ranges)
    .map(([key, value]) => {
      const row = record(value);
      if (!row) return null;
      const min = num(row.min);
      const max = num(row.max);
      if (min === null || max === null) return null;
      return { key, label: text(row.label) ?? key, min, max, unit: text(row.unit) ?? "" };
    })
    .filter((item): item is RangeFact => item !== null);
  const mae = num(holdout?.mae);
  const rmse = num(holdout?.rmse);
  const r2 = num(holdout?.r2);
  return {
    name: text(selected?.model),
    reason: text(selected?.reason),
    datasetLabel: text(dataset?.label),
    datasetNature: text(dataset?.nature),
    disclaimer: text(dataset?.disclaimer),
    holdout: mae !== null && rmse !== null && r2 !== null ? { mae, rmse, r2 } : null,
    perTarget,
    importanceMethod: text(importance?.method) ?? text(importance?.label),
    importance: importanceRows(importance?.rows),
    ranges: rangeFacts,
    supportsSpread: model.supports_ensemble_spread === true,
    intendedUse: text(model.intended_use),
    nonIntendedUse: text(model.non_intended_use),
  };
}

export function readSimulation(raw: unknown): SimulationFacts | null {
  const sim = record(raw);
  if (!sim) return null;
  const before = record(sim.before);
  const after = record(sim.after);
  if (!before || !after) return null;
  const numeric = (source: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(source)
        .map(([key, value]) => [key, num(value)] as const)
        .filter((entry): entry is [string, number] => entry[1] !== null),
    );
  const changes = Array.isArray(sim.changes)
    ? sim.changes
        .map((item) => {
          const row = record(item);
          if (!row) return null;
          const key = text(row.key);
          const label = text(row.label);
          const from = num(row.from);
          const to = num(row.to);
          if (!key || !label || from === null || to === null) return null;
          return { key, label, from, to, unit: text(row.unit) ?? "" };
        })
        .filter((item): item is SimulationFacts["changes"][number] => item !== null)
    : [];
  return { before: numeric(before), after: numeric(after), changes };
}
