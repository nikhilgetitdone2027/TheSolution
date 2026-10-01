import { useSyncExternalStore } from "react";
import type { ImportanceRow, Optimization, Prediction, Sample, Validation } from "../types";
import { bus, type Scenario } from "./events";

export type AnalysisStage =
  | "idle"
  | "ingesting"
  | "composition"
  | "validation"
  | "prediction"
  | "explanation"
  | "optimization"
  | "simulation"
  | "report"
  | "complete"
  | "error";

export type StepId =
  | "sample"
  | "composition"
  | "validation"
  | "ml"
  | "prediction"
  | "explanation"
  | "optimization"
  | "simulation"
  | "impact"
  | "report";

export type StepStatus = "idle" | "active" | "processing" | "success" | "error" | "skipped" | "unavailable";

export type Focus = StepId | "flow" | "best" | "complete" | null;

export type CueId =
  | "sample"
  | "composition"
  | "validation"
  | "validated"
  | "invalid"
  | "ml"
  | "prediction"
  | "product_flow"
  | "explanation"
  | "optimization"
  | "optimized"
  | "optimization_skipped"
  | "complete"
  | "error"
  | "whatif"
  | "trust"
  | "summary";

export type Cue = { id: CueId; engine: AnalysisWorkflowState };

export interface AnalysisWorkflowState {
  stage: AnalysisStage;
  status: "idle" | "running" | "success" | "error";
  sampleId?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  focus: Focus;
  steps: Record<StepId, { status: StepStatus; detail?: string }>;
  data: {
    validation?: Validation | null;
    prediction?: Prediction | null;
    importance?: ImportanceRow[];
    optimization?: Optimization | null;
    scenario?: Scenario;
  };
  caption: string | null;
  theaterOpen: boolean;
  guided: boolean;
  paused: boolean;
}

export const STEP_ORDER: StepId[] = [
  "sample",
  "composition",
  "validation",
  "ml",
  "prediction",
  "explanation",
  "optimization",
  "simulation",
  "impact",
  "report",
];

function blankSteps(): AnalysisWorkflowState["steps"] {
  return Object.fromEntries(STEP_ORDER.map((id) => [id, { status: "idle" as StepStatus }])) as AnalysisWorkflowState["steps"];
}

type Beat = {
  apply: (state: AnalysisWorkflowState) => AnalysisWorkflowState;
  dwell: number;
  cue?: CueId;
};

type Narrator = (cue: Cue) => Promise<void>;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function step(state: AnalysisWorkflowState, id: StepId, status: StepStatus, detail?: string): AnalysisWorkflowState {
  return { ...state, steps: { ...state.steps, [id]: { status, detail: detail ?? state.steps[id].detail } } };
}

function impactStatus(sample: Sample): { status: StepStatus; detail: string } {
  const metrics = sample.pathways?.pathways.flatMap((pathway) => pathway.metrics) ?? [];
  const carbon = metrics.find((metric) => metric.name === "Carbon impact");
  if (!sample.prediction?.available) return { status: "idle", detail: "Needs a prediction" };
  if (carbon && !carbon.available) return { status: "unavailable", detail: "Carbon impact unavailable" };
  return { status: "success", detail: "Derived flows available" };
}

class WorkflowEngine {
  private state: AnalysisWorkflowState = {
    stage: "idle",
    status: "idle",
    focus: null,
    steps: blankSteps(),
    data: {},
    caption: null,
    theaterOpen: false,
    guided: false,
    paused: false,
  };
  private listeners = new Set<() => void>();
  private queue: Beat[] = [];
  private draining = false;
  private narrator: Narrator | null = null;
  private settledWaiters: Array<() => void> = [];
  private resumeWaiters: Array<() => void> = [];

  constructor() {
    bus.on("analysis:start", ({ sampleId }) => this.begin(sampleId));
    bus.on("sample:ingested", () =>
      this.enqueue(
        {
          apply: (s) => ({ ...step(step(s, "sample", "success", "Sample received"), "composition", "active"), stage: "ingesting", focus: "sample" }),
          dwell: 1300,
          cue: "sample",
        },
        {
          apply: (s) => ({ ...step(s, "composition", "processing", "Reading fractions"), stage: "composition", focus: "composition" }),
          dwell: 2200,
          cue: "composition",
        },
        {
          apply: (s) => step(s, "composition", "success", "Fractions read"),
          dwell: 300,
        },
      ),
    );
    bus.on("validation:start", () =>
      this.enqueue({
        apply: (s) => ({ ...step(s, "validation", "processing", "Running checks"), stage: "validation", focus: "validation" }),
        dwell: 1500,
        cue: "validation",
      }),
    );
    bus.on("sample:validated", ({ validation }) =>
      this.enqueue({
        apply: (s) => ({
          ...step(s, "validation", "success", validation ? `Quality ${validation.quality_score}` : "Checks passed"),
          data: { ...s.data, validation },
        }),
        dwell: 2200,
        cue: "validated",
      }),
    );
    bus.on("prediction:start", () =>
      this.enqueue({
        apply: (s) => ({ ...step(step(s, "ml", "processing", "Model running"), "prediction", "active"), stage: "prediction", focus: "ml" }),
        dwell: 2200,
        cue: "ml",
      }),
    );
    bus.on("prediction:complete", ({ prediction }) =>
      this.enqueue(
        {
          apply: (s) => ({
            ...step(step(s, "ml", "success", "Inference done"), "prediction", prediction?.available ? "success" : "error", prediction?.available ? "Estimate ready" : "Unavailable"),
            data: { ...s.data, prediction },
            focus: "prediction",
          }),
          dwell: 3200,
          cue: "prediction",
        },
        {
          apply: (s) => ({ ...s, focus: "flow" }),
          dwell: 2600,
          cue: "product_flow",
        },
      ),
    );
    bus.on("explanation:start", () =>
      this.enqueue({
        apply: (s) => ({ ...step(s, "explanation", "processing", "Ranking inputs"), stage: "explanation", focus: "explanation" }),
        dwell: 900,
      }),
    );
    bus.on("explanation:complete", ({ importance }) =>
      this.enqueue({
        apply: (s) => ({ ...step(s, "explanation", "success", "Importance ranked"), data: { ...s.data, importance }, focus: "explanation" }),
        dwell: 2600,
        cue: "explanation",
      }),
    );
    bus.on("optimization:start", () =>
      this.enqueue({
        apply: (s) => ({ ...step(s, "optimization", "processing", "Searching range"), stage: "optimization", focus: "optimization" }),
        dwell: 2400,
        cue: "optimization",
      }),
    );
    bus.on("optimization:complete", ({ optimization }) =>
      this.enqueue({
        apply: (s) => ({
          ...step(s, "optimization", "success", optimization?.evaluated ? `${optimization.evaluated} evaluated` : "Search done"),
          data: { ...s.data, optimization },
          focus: "best",
        }),
        dwell: 2800,
        cue: "optimized",
      }),
    );
    bus.on("optimization:skipped", ({ reason }) =>
      this.enqueue({
        apply: (s) => ({ ...step(s, "optimization", "skipped", reason), focus: "optimization" }),
        dwell: 1600,
        cue: "optimization_skipped",
      }),
    );
    bus.on("analysis:complete", ({ sample }) =>
      this.enqueue({
        apply: (s) => {
          const impact = impactStatus(sample);
          return {
            ...step(s, "impact", impact.status, impact.detail),
            stage: "complete",
            status: "success",
            focus: "complete",
            completedAt: Date.now(),
          };
        },
        dwell: 1800,
        cue: "complete",
      }),
    );
    bus.on("analysis:error", ({ message, stage: where, validation }) =>
      this.enqueue({
        apply: (s) => {
          const id: StepId = where === "validation" ? "validation" : this.currentStep(s);
          return {
            ...step(s, id, "error", message),
            stage: "error",
            status: "error",
            error: message,
            focus: id,
            completedAt: Date.now(),
            data: validation === undefined ? s.data : { ...s.data, validation },
          };
        },
        dwell: 1800,
        cue: where === "validation" ? "invalid" : "error",
      }),
    );
    bus.on("simulation:start", () => this.patch((s) => ({ ...step(s, "simulation", "processing", "Model re-evaluating"), stage: "simulation" })));
    bus.on("simulation:complete", ({ scenario }) =>
      this.patch((s) => ({ ...step(s, "simulation", "success", "Scenario compared"), data: { ...s.data, scenario } })),
    );
    bus.on("simulation:error", ({ message }) => this.patch((s) => step(s, "simulation", "error", message)));
    bus.on("report:start", () => this.patch((s) => ({ ...step(s, "report", "processing", "Writing report"), stage: "report" })));
    bus.on("report:complete", () => this.patch((s) => step(s, "report", "success", "Report ready")));
    bus.on("report:error", ({ message }) => this.patch((s) => step(s, "report", "error", message)));
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  private set(next: AnalysisWorkflowState) {
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  patch(update: (state: AnalysisWorkflowState) => AnalysisWorkflowState) {
    this.set(update(this.state));
  }

  private currentStep(s: AnalysisWorkflowState): StepId {
    const running = STEP_ORDER.find((id) => s.steps[id].status === "processing" || s.steps[id].status === "active");
    return running ?? "sample";
  }

  setNarrator(narrator: Narrator | null) {
    this.narrator = narrator;
  }

  setCaption(caption: string | null) {
    this.patch((s) => ({ ...s, caption }));
  }

  setTheater(open: boolean) {
    this.patch((s) => ({ ...s, theaterOpen: open }));
  }

  setGuided(guided: boolean) {
    this.patch((s) => ({ ...s, guided, paused: guided ? s.paused : false }));
    if (!guided) this.release();
  }

  setPaused(paused: boolean) {
    this.patch((s) => ({ ...s, paused }));
    if (!paused) this.release();
  }

  private release() {
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  private waitWhilePaused(): Promise<void> {
    if (!this.state.paused) return Promise.resolve();
    return new Promise((resolve) => this.resumeWaiters.push(resolve));
  }

  async narrate(id: CueId): Promise<void> {
    if (!this.narrator) return;
    try {
      await Promise.race([this.narrator({ id, engine: this.state }), sleep(20000)]);
    } catch {
      // Narration is optional. The workflow continues without speech.
    }
  }

  begin(sampleId: string) {
    this.queue = [];
    this.set({
      ...this.state,
      stage: "ingesting",
      status: "running",
      sampleId,
      startedAt: Date.now(),
      completedAt: undefined,
      error: undefined,
      focus: "sample",
      steps: { ...blankSteps(), sample: { status: "processing", detail: "Receiving sample" } },
      data: {},
      caption: null,
      theaterOpen: true,
    });
  }

  hydrate(sample: Sample | null) {
    if (this.state.status === "running") return;
    if (!sample) {
      this.set({ ...this.state, stage: "idle", status: "idle", focus: null, steps: blankSteps(), data: {}, sampleId: undefined });
      return;
    }
    if (this.state.sampleId === sample.id && this.state.status !== "idle") {
      const impact = impactStatus(sample);
      this.patch((s) => step(s, "impact", impact.status, impact.detail));
      return;
    }
    const steps = blankSteps();
    steps.sample = { status: "success", detail: "Sample loaded" };
    steps.composition = { status: "success", detail: "Fractions entered" };
    if (sample.validation) {
      steps.validation = sample.validation.prediction_allowed
        ? { status: "success", detail: `Quality ${sample.validation.quality_score}` }
        : { status: "error", detail: sample.validation.blocking_reasons[0] ?? "Blocked" };
    }
    if (sample.prediction) {
      const ok = sample.prediction.available;
      steps.ml = { status: ok ? "success" : "error", detail: ok ? "Inference done" : "Unavailable" };
      steps.prediction = { status: ok ? "success" : "error", detail: ok ? "Estimate ready" : "Unavailable" };
    }
    if (sample.explanation) steps.explanation = { status: "success", detail: "Importance ranked" };
    if (sample.optimization) {
      steps.optimization = sample.optimization.available
        ? { status: "success", detail: `${sample.optimization.evaluated ?? 0} evaluated` }
        : { status: "skipped", detail: sample.optimization.reason };
    }
    if (sample.scenarios.length) steps.simulation = { status: "success", detail: "Scenario saved" };
    const impact = impactStatus(sample);
    steps.impact = { status: impact.status, detail: impact.detail };
    if (sample.reportHtml) steps.report = { status: "success", detail: "Report ready" };
    this.set({
      ...this.state,
      stage: sample.prediction?.available ? "complete" : "idle",
      status: sample.prediction?.available ? "success" : "idle",
      sampleId: sample.id,
      focus: null,
      steps,
      data: {
        validation: sample.validation,
        prediction: sample.prediction,
        importance: sample.explanation?.importance,
        optimization: sample.optimization,
      },
    });
  }

  whenSettled(): Promise<void> {
    if (!this.draining && !this.queue.length && this.state.status !== "running") return Promise.resolve();
    return new Promise((resolve) => this.settledWaiters.push(resolve));
  }

  private enqueue(...beats: Beat[]) {
    this.queue.push(...beats);
    void this.drain();
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;
    while (this.queue.length) {
      await this.waitWhilePaused();
      const beat = this.queue.shift();
      if (!beat) break;
      this.set(beat.apply(this.state));
      const scale = reducedMotion() ? 0.12 : 1;
      await Promise.all([sleep(beat.dwell * scale), beat.cue ? this.narrate(beat.cue) : Promise.resolve()]);
    }
    this.draining = false;
    if (this.state.status !== "running") {
      const waiters = this.settledWaiters;
      this.settledWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  }
}

export const workflow = new WorkflowEngine();

export function useWorkflow(): AnalysisWorkflowState {
  return useSyncExternalStore(workflow.subscribe, workflow.getSnapshot);
}
