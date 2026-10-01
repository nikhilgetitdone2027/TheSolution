import type { ImportanceRow, Optimization, Prediction, Sample, Validation } from "../types";

export type ScenarioChange = { key: string; label: string; from: number; to: number; unit: string };
export type Scenario = { before: Record<string, number>; after: Record<string, number>; changes: ScenarioChange[] };

export type WorkflowEvents = {
  "analysis:start": { sampleId: string };
  "sample:ingested": { sampleId: string };
  "validation:start": Record<string, never>;
  "sample:validated": { validation: Validation | null };
  "prediction:start": Record<string, never>;
  "prediction:complete": { prediction: Prediction | null };
  "explanation:start": Record<string, never>;
  "explanation:complete": { importance: ImportanceRow[] };
  "optimization:start": Record<string, never>;
  "optimization:complete": { optimization: Optimization | null };
  "optimization:skipped": { reason: string };
  "analysis:complete": { sample: Sample };
  "analysis:error": { message: string; stage: "validation" | "unknown"; validation?: Validation | null };
  "simulation:start": Record<string, never>;
  "simulation:complete": { scenario: Scenario };
  "simulation:error": { message: string };
  "report:start": Record<string, never>;
  "report:complete": Record<string, never>;
  "report:error": { message: string };
};

type Handler<K extends keyof WorkflowEvents> = (payload: WorkflowEvents[K]) => void;

const handlers = new Map<keyof WorkflowEvents, Set<Handler<never>>>();

export const bus = {
  on<K extends keyof WorkflowEvents>(name: K, handler: Handler<K>): () => void {
    const set = handlers.get(name) ?? new Set();
    set.add(handler as Handler<never>);
    handlers.set(name, set);
    return () => set.delete(handler as Handler<never>);
  },
  emit<K extends keyof WorkflowEvents>(name: K, payload: WorkflowEvents[K]): void {
    for (const handler of handlers.get(name) ?? []) {
      (handler as Handler<K>)(payload);
    }
  },
};
