import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { stopSpeaking } from "../components/saathi/SaathiVoice";
import { useAnalysis } from "../state/AnalysisContext";
import { useWorkflow, workflow, type Focus } from "./engine";
import { transitionTo } from "./transition";

const DEMO_SAMPLE = "Mixed Plastic Batch #001";

export const SCENES = [
  "Sample",
  "Composition",
  "Validation",
  "ML engine",
  "Prediction",
  "Product flow",
  "Explainability",
  "Optimization",
  "Best configuration",
  "What-If",
  "Trust Center",
  "Summary",
] as const;

const FOCUS_SCENE: Partial<Record<NonNullable<Focus>, number>> = {
  sample: 0,
  composition: 1,
  validation: 2,
  ml: 3,
  prediction: 4,
  flow: 5,
  explanation: 6,
  optimization: 7,
  best: 8,
  complete: 8,
};

type Guided = {
  running: boolean;
  scene: number;
  start: () => void;
  exit: () => void;
  restart: () => void;
  togglePause: () => void;
};

const GuidedContext = createContext<Guided | null>(null);

class Aborted extends Error {}

export function GuidedDemoProvider({ children }: { children: ReactNode }) {
  const store = useAnalysis();
  const engine = useWorkflow();
  const navigate = useNavigate();
  const storeRef = useRef(store);
  storeRef.current = store;
  const runId = useRef(0);
  const [extraScene, setExtraScene] = useState<number | null>(null);

  const running = engine.guided;
  const scene = extraScene ?? FOCUS_SCENE[engine.focus ?? "sample"] ?? 0;

  function waitFor(check: () => boolean, id: number, timeout = 15000): Promise<void> {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (runId.current !== id) return reject(new Aborted());
        if (check()) return resolve();
        if (Date.now() - started > timeout) return reject(new Error("Timed out waiting for data."));
        window.setTimeout(tick, 120);
      };
      tick();
    });
  }

  async function checkpoint(id: number) {
    await waitFor(() => !workflow.getSnapshot().paused, id, 60 * 60 * 1000);
  }

  async function run(id: number) {
    try {
      setExtraScene(null);
      workflow.setGuided(true);
      workflow.setPaused(false);
      await workflow.whenSettled();
      transitionTo(navigate, "/app");
      let sample = storeRef.current.samples.find((item) => item.name === DEMO_SAMPLE && item.origin === "demo");
      if (!sample) sample = await storeRef.current.loadDemo("A");
      else storeRef.current.select(sample.id);
      const sampleId = sample.id;
      await waitFor(() => storeRef.current.active?.id === sampleId, id);
      if (runId.current !== id) throw new Aborted();

      await storeRef.current.analyze("energy_recovery", sampleId).catch(() => undefined);
      await workflow.whenSettled();
      if (runId.current !== id) throw new Aborted();
      if (workflow.getSnapshot().status === "error") return;

      await checkpoint(id);
      setExtraScene(9);
      await waitFor(() => Boolean(storeRef.current.active?.optimization?.available), id);
      transitionTo(navigate, "/app/simulate");
      const range = storeRef.current.model?.optimization_boundary.ranges.temperature_c;
      if (range) {
        const target = Math.round((range.min + 0.8 * (range.max - range.min)) * 10) / 10;
        await storeRef.current.simulate({ temperature_c: target });
        await checkpoint(id);
        await workflow.narrate("whatif");
      }

      await checkpoint(id);
      if (runId.current !== id) throw new Aborted();
      setExtraScene(10);
      transitionTo(navigate, "/app/trust");
      await workflow.narrate("trust");

      await checkpoint(id);
      if (runId.current !== id) throw new Aborted();
      setExtraScene(11);
      transitionTo(navigate, "/app");
      await workflow.narrate("summary");
    } catch (reason) {
      if (!(reason instanceof Aborted) && runId.current === id) {
        workflow.setCaption(reason instanceof Error ? `Guided demo stopped: ${reason.message}` : "Guided demo stopped.");
      }
    } finally {
      if (runId.current === id) {
        workflow.setGuided(false);
        setExtraScene(null);
      }
    }
  }

  function start() {
    runId.current += 1;
    void run(runId.current);
  }

  function exit() {
    runId.current += 1;
    stopSpeaking();
    workflow.setGuided(false);
    workflow.setCaption(null);
    setExtraScene(null);
  }

  function restart() {
    exit();
    start();
  }

  function togglePause() {
    const paused = !workflow.getSnapshot().paused;
    workflow.setPaused(paused);
    if (paused) window.speechSynthesis?.pause();
    else window.speechSynthesis?.resume();
  }

  useEffect(() => {
    if (!running) return;
    const interrupt = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.("[data-guided-ui]")) return;
      if (event instanceof KeyboardEvent && ["Shift", "Control", "Alt", "Meta", "Tab"].includes(event.key)) return;
      if (!workflow.getSnapshot().paused) {
        workflow.setPaused(true);
        window.speechSynthesis?.pause();
      }
    };
    window.addEventListener("pointerdown", interrupt, true);
    window.addEventListener("keydown", interrupt, true);
    return () => {
      window.removeEventListener("pointerdown", interrupt, true);
      window.removeEventListener("keydown", interrupt, true);
    };
  }, [running]);

  return <GuidedContext.Provider value={{ running, scene, start, exit, restart, togglePause }}>{children}</GuidedContext.Provider>;
}

export function useGuidedDemo(): Guided {
  const guided = useContext(GuidedContext);
  if (!guided) throw new Error("useGuidedDemo must be used inside GuidedDemoProvider");
  return guided;
}

export function GuidedDemoBar() {
  const guided = useGuidedDemo();
  const engine = useWorkflow();
  if (!guided.running) return null;
  return (
    <div className="guided-bar" role="region" aria-label="Guided demo controls" data-guided-ui>
      <p className="text-sm">
        <span className="font-medium">Guided demo</span>
        <span className="text-muted">
          {" "}
          · Scene {guided.scene + 1} of {SCENES.length} · {SCENES[guided.scene]}
          {engine.paused ? " · Paused" : ""}
        </span>
      </p>
      <ol className="guided-dots" aria-hidden>
        {SCENES.map((label, index) => (
          <li key={label} className={index < guided.scene ? "is-done" : index === guided.scene ? "is-now" : ""} />
        ))}
      </ol>
      <div className="flex gap-2">
        <button className="bg-pine px-3 py-1 text-sm text-white" type="button" onClick={guided.togglePause}>
          {engine.paused ? "Resume" : "Pause"}
        </button>
        <button className="border border-line px-3 py-1 text-sm" type="button" onClick={guided.restart}>
          Replay
        </button>
        <button className="border border-line px-3 py-1 text-sm" type="button" onClick={guided.exit}>
          Exit
        </button>
      </div>
    </div>
  );
}
