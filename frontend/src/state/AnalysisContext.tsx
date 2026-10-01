import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api";
import type { ModelMeta, Profile, Sample, Simulation, Stage } from "../types";
import { bus, type Scenario } from "../workflow/events";
import { workflow } from "../workflow/engine";

function announceStage(stage: Stage) {
  const payload = stage.payload ?? {};
  if (stage.id === "ingest" && stage.status === "complete") bus.emit("sample:ingested", { sampleId: stage.detail ?? "" });
  if (stage.id === "validate" && stage.status === "running") bus.emit("validation:start", {});
  if (stage.id === "validate" && stage.status === "complete") bus.emit("sample:validated", { validation: payload.validation ?? null });
  if (stage.id === "predict" && stage.status === "running") bus.emit("prediction:start", {});
  if (stage.id === "predict" && stage.status === "complete") bus.emit("prediction:complete", { prediction: payload.prediction ?? null });
  if (stage.id === "explain" && stage.status === "running") bus.emit("explanation:start", {});
  if (stage.id === "explain" && stage.status === "complete") bus.emit("explanation:complete", { importance: payload.importance ?? [] });
  if (stage.id === "optimize" && stage.status === "running") bus.emit("optimization:start", {});
  if (stage.id === "optimize" && stage.status === "complete") bus.emit("optimization:complete", { optimization: payload.optimization ?? null });
  if (stage.id === "optimize" && stage.status === "skipped") bus.emit("optimization:skipped", { reason: stage.detail ?? "Optimization unavailable." });
}

type Health = { model: { model: string; dataset: string } | null; error?: string };

type Store = {
  health: Health | null;
  model: ModelMeta | null;
  samples: Sample[];
  active: Sample | null;
  busy: string | null;
  error: string | null;
  stages: Stage[];
  profile: Profile | null;
  simulation: Simulation | null;
  scenario: Scenario | null;
  judgeStep: number;
  judgeActive: boolean;
  refresh: () => Promise<void>;
  select: (id: string) => void;
  loadDemo: (id: string) => Promise<Sample>;
  uploadCsv: (filename: string, csvText: string, category: string) => Promise<string[]>;
  createManual: (name: string, category: string, inputs: Record<string, number | null>) => Promise<void>;
  saveInputs: (inputs: Record<string, number | null>) => Promise<void>;
  validateActive: () => Promise<Sample | null>;
  analyze: (objective?: string, sampleId?: string) => Promise<void>;
  optimize: (objective: string, weights?: Record<string, number>) => Promise<void>;
  simulate: (modified: Record<string, number>, saveAs?: string) => Promise<void>;
  ask: (question: string) => Promise<string>;
  createReport: () => Promise<string>;
  loadProfile: () => Promise<void>;
  setJudge: (active: boolean, step?: number) => void;
  clearError: () => void;
};

const AnalysisContext = createContext<Store | null>(null);

function parseEvents(chunk: string, onEvent: (name: string, data: unknown) => void, rest: string) {
  const combined = rest + chunk;
  const parts = combined.split("\n\n");
  const carry = parts.pop() ?? "";
  for (const part of parts) {
    const lines = part.split("\n");
    const name = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
    const dataLine = lines.find((line) => line.startsWith("data:"));
    if (!dataLine) continue;
    onEvent(name, JSON.parse(dataLine.slice(5).trim()));
  }
  return carry;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [model, setModel] = useState<ModelMeta | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [scenario, setScenario] = useState<Store["scenario"]>(null);
  const [judgeActive, setJudgeActive] = useState(false);
  const [judgeStep, setJudgeStep] = useState(0);

  const active = samples.find((sample) => sample.id === activeId) ?? null;

  async function refresh() {
    const [healthResult, sampleResult] = await Promise.all([api.health(), api.samples()]);
    setHealth({ model: healthResult.model, error: healthResult.error });
    setSamples(sampleResult.samples);
    if (healthResult.model) {
      setModel(await api.model());
    }
  }

  useEffect(() => {
    refresh().catch((reason: Error) => setError(reason.message));
    // Boot load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    workflow.hydrate(active);
  }, [active]);

  function replace(sample: Sample) {
    setSamples((current) => [sample, ...current.filter((item) => item.id !== sample.id)]);
    setActiveId(sample.id);
  }

  async function run<T>(label: string, work: () => Promise<T>): Promise<T> {
    setBusy(label);
    setError(null);
    try {
      return await work();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Request failed.";
      setError(message);
      throw reason;
    } finally {
      setBusy(null);
    }
  }

  const value: Store = {
      health,
      model,
      samples,
      active,
      busy,
      error,
      stages,
      profile,
      simulation,
      scenario,
      judgeStep,
      judgeActive,
      refresh,
      select: (id: string) => {
        setActiveId(id);
        setProfile(null);
        setSimulation(null);
        setScenario(null);
      },
      loadDemo: async (id: string) =>
        run("demo", async () => {
          const sample = await api.demo(id);
          replace(sample);
          setProfile(null);
          setSimulation(null);
          setScenario(null);
          setStages([]);
          return sample;
        }),
      uploadCsv: async (filename, csvText, category) =>
        run("upload", async () => {
          const result = await api.csv({ filename, csvText, category });
          setSamples((current) => [...result.samples, ...current]);
          if (result.samples[0]) setActiveId(result.samples[0].id);
          if (result.duplicateRows.length) {
            setError(result.duplicateRows.map((row) => row.message).join(" "));
          }
          return result.duplicateRows.map((row) => row.message);
        }),
      createManual: async (name, category, inputs) => {
        const sample = await run("manual", () => api.manual({ name, category, inputs }));
        replace(sample);
      },
      saveInputs: async (inputs) => {
        if (!active) return;
        const sample = await run("inputs", () => api.inputs(active.id, inputs));
        replace(sample);
        setProfile(null);
        setSimulation(null);
        setScenario(null);
      },
      validateActive: async () => {
        if (!active) return null;
        const sample = await run("validate", () => api.validate(active.id));
        replace(sample);
        return sample;
      },
      analyze: async (objective = "energy_recovery", sampleId) => {
        const targetId = sampleId ?? active?.id;
        if (!targetId) return;
        setBusy("analyze");
        setError(null);
        setStages([]);
        setSimulation(null);
        setScenario(null);
        let halted = false;
        let reported = false;
        bus.emit("analysis:start", { sampleId: targetId });
        try {
          const response = await fetch(`/api/samples/${targetId}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objective }),
          });
          if (!response.ok || !response.body) {
            throw new Error("Analysis could not be started.");
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let carry = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            carry = parseEvents(decoder.decode(value, { stream: true }), (name, data) => {
              if (name === "stage") {
                const stage = data as Stage;
                setStages((current) => {
                  const without = current.filter((item) => item.id !== stage.id);
                  return [...without, stage];
                });
                announceStage(stage);
              }
              if (name === "halted") {
                halted = true;
                reported = true;
                const payload = data as { reason: string; sample: Sample };
                setError(payload.reason);
                replace(payload.sample);
                bus.emit("analysis:error", { message: payload.reason, stage: "validation", validation: payload.sample.validation });
              }
              if (name === "done") {
                const sample = (data as { sample: Sample }).sample;
                replace(sample);
                bus.emit("analysis:complete", { sample });
              }
              if (name === "error") {
                throw new Error((data as { message: string }).message);
              }
            }, carry);
          }
          if (halted) {
            throw new Error("Analysis stopped before a prediction was available.");
          }
        } catch (reason) {
          if (!halted) {
            setError(reason instanceof Error ? reason.message : "Analysis failed.");
          }
          if (!reported) {
            bus.emit("analysis:error", { message: reason instanceof Error ? reason.message : "Analysis failed.", stage: "unknown" });
          }
          throw reason;
        } finally {
          setBusy(null);
        }
      },
      optimize: async (objective, weights) => {
        if (!active) return;
        bus.emit("optimization:start", {});
        try {
          const sample = await run("optimize", () => api.optimize(active.id, objective, weights));
          replace(sample);
          if (sample.optimization?.available) bus.emit("optimization:complete", { optimization: sample.optimization });
          else bus.emit("optimization:skipped", { reason: sample.optimization?.reason ?? "Optimization unavailable." });
        } catch (reason) {
          bus.emit("optimization:skipped", { reason: reason instanceof Error ? reason.message : "Optimization failed." });
          throw reason;
        }
      },
      simulate: async (modified, saveAs) => {
        if (!active) return;
        const beforeInputs = active.inputs;
        bus.emit("simulation:start", {});
        let result: Awaited<ReturnType<typeof api.simulate>>;
        try {
          result = await run("simulate", () => api.simulate(active.id, modified, saveAs));
        } catch (reason) {
          bus.emit("simulation:error", { message: reason instanceof Error ? reason.message : "Simulation failed." });
          throw reason;
        }
        setSimulation(result);
        const ranges = model?.optimization_boundary.ranges ?? {};
        const nextScenario: Scenario = {
          before: result.before.output_map ?? {},
          after: result.after.output_map ?? {},
          changes: Object.entries(modified).flatMap(([key, to]) => {
            const from = Number(beforeInputs[key]);
            if (!Number.isFinite(from) || Math.abs(from - to) < 1e-6) return [];
            const band = ranges[key];
            return [{ key, label: band?.label ?? key, from, to, unit: band?.unit ?? "" }];
          }),
        };
        setScenario(nextScenario);
        bus.emit("simulation:complete", { scenario: nextScenario });
        if (saveAs) {
          const fresh = await api.sample(active.id);
          replace(fresh);
        }
      },
      ask: async (question) => {
        if (!active) return "Load a sample before asking.";
        const result = await run("ask", () => api.ask(active.id, question));
        const fresh = await api.sample(active.id);
        replace(fresh);
        return result.answer;
      },
      createReport: async () => {
        if (!active) return "";
        bus.emit("report:start", {});
        try {
          const result = await run("report", () => api.report(active.id));
          const fresh = await api.sample(active.id);
          replace(fresh);
          bus.emit("report:complete", {});
          return result.html;
        } catch (reason) {
          bus.emit("report:error", { message: reason instanceof Error ? reason.message : "Report failed." });
          throw reason;
        }
      },
      loadProfile: async () => {
        if (!active) return;
        const next = await run("profile", () => api.profile(active.id));
        setProfile(next);
      },
      setJudge: (nextActive, step = 0) => {
        setJudgeActive(nextActive);
        setJudgeStep(step);
      },
      clearError: () => setError(null),
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const store = useContext(AnalysisContext);
  if (!store) throw new Error("useAnalysis must be used inside AnalysisProvider");
  return store;
}
