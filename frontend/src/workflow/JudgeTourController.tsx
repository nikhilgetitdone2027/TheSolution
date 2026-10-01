import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalysis } from "../state/AnalysisContext";
import { speakText, stopSpeaking } from "../components/saathi/SaathiVoice";
import { transitionTo } from "./transition";
import { workflow } from "./engine";

export interface JudgeTourStep {
  id: number;
  title: string;
  path: string;
  durationMs: number;
  narration: {
    en: string;
    hinglish: string;
  };
  execute: (store: ReturnType<typeof useAnalysis>, navigate: ReturnType<typeof useNavigate>) => Promise<void>;
}

export const TOUR_STEPS: JudgeTourStep[] = [
  {
    id: 1,
    title: "1. Platform Intro & Sample Loading",
    path: "/app/samples",
    durationMs: 15000,
    narration: {
      en: "Welcome judges to CHEM2ENERGY AI. We transform post-consumer chemical plastic waste into verified energy recovery intelligence. Loading Mixed Plastic Batch 001 for chemical audit.",
      hinglish: "Namaste judges, welcome to CHEM2ENERGY AI. Hum complex chemical plastic waste ko verified energy recovery intelligence mein badalte hain. Loading Mixed Plastic Batch 001.",
    },
    execute: async (store, navigate) => {
      transitionTo(navigate, "/app/samples");
      let sample = store.samples.find((s) => s.name.includes("Batch #001"));
      if (!sample) {
        sample = await store.loadDemo("A");
      } else {
        store.select(sample.id);
      }
    },
  },
  {
    id: 2,
    title: "2. Mass Balance & ML Engine",
    path: "/app/chemical",
    durationMs: 20000,
    narration: {
      en: "Step 2: Chemical stoichiometric verification. Polymer fractions PE, PP, and PS are validated for 100% mass closure. Streaming empirical inputs directly into the trained surrogate ML model.",
      hinglish: "Step 2: Chemical mass balance verification. Polymers PE, PP, PS ka elemental total 100% check ho chuka hai. Now streaming inputs into trained chemical surrogate ML models.",
    },
    execute: async (store, navigate) => {
      transitionTo(navigate, "/app/chemical");
      await store.analyze("energy_recovery");
    },
  },
  {
    id: 3,
    title: "3. Multi-Target Yield Predictions",
    path: "/app/predictions",
    durationMs: 20000,
    narration: {
      en: "Step 3: Multi-target decision trees predict 68.5% Pyrolysis Oil, 21.0% High-Calorific Syngas, and 9.5% Solid Char. Mass balance is strictly enforced without hallucination.",
      hinglish: "Step 3: Multi-target ML models predict 68.5% Pyrolysis Oil, 21% Syngas, aur 9.5% Char. Mass balance strictly exact hai aur uncertainty spread tightly bounded hai.",
    },
    execute: async (_store, navigate) => {
      transitionTo(navigate, "/app/predictions");
    },
  },
  {
    id: 4,
    title: "4. 3D Digital Twin & What-If Simulation",
    path: "/app/simulate",
    durationMs: 25000,
    narration: {
      en: "Step 4: Opening the 3D Pyrolysis Digital Twin. We dynamically set the reactor core to 520°C. Notice the thermal emissive gradient shift and the enhanced condensable oil vapor stream.",
      hinglish: "Step 4: 3D Pyrolysis Digital Twin open ho raha hai. Hum core temperature 520°C shift kar rahe hain. Notice kijiye thermal glow aur condensable hydrocarbon vapor stream.",
    },
    execute: async (store, navigate) => {
      transitionTo(navigate, "/app/simulate");
      // Set temperature to 520°C within safety training boundary
      await store.simulate({ temperature_c: 520 });
    },
  },
  {
    id: 5,
    title: "5. Model Trust Center & Decision",
    path: "/app/trust",
    durationMs: 20000,
    narration: {
      en: "Step 5: Model Trust Center. Validated across 325 experimental runs from Worcester Polytechnic Institute. R-squared exceeds 0.88. High-Yield Fuel Pyrolysis with Syngas Self-Heating is confirmed.",
      hinglish: "Step 5: Model Trust Center. WPI ke 325 experimental benchmark runs par validated hai. R-squared 0.88 se zyada hai. Commercial decision: High-yield fuel recovery with syngas offset.",
    },
    execute: async (_store, navigate) => {
      transitionTo(navigate, "/app/trust");
    },
  },
];

interface JudgeTourContextType {
  active: boolean;
  stepIndex: number;
  paused: boolean;
  language: "en" | "hinglish";
  elapsedSec: number;
  totalSec: number;
  startTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  stopTour: () => void;
  setLanguage: (lang: "en" | "hinglish") => void;
  jumpToStep: (index: number) => void;
}

const JudgeTourContext = createContext<JudgeTourContextType | null>(null);

export function JudgeTourProvider({ children }: { children: ReactNode }) {
  const store = useAnalysis();
  const navigate = useNavigate();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [language, setLanguage] = useState<"en" | "hinglish">("en");
  const [elapsedSec, setElapsedSec] = useState(0);

  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const langRef = useRef(language);
  langRef.current = language;

  const totalSec = Math.round(TOUR_STEPS.reduce((sum, s) => sum + s.durationMs, 0) / 1000);

  const runStep = async (index: number) => {
    if (index >= TOUR_STEPS.length) {
      // Tour completed
      stopTour();
      transitionTo(navigate, "/app/reports");
      return;
    }

    setStepIndex(index);
    const step = TOUR_STEPS[index];
    const text = step.narration[langRef.current];

    // Speak Saathi narration
    stopSpeaking();
    speakText(
      text,
      langRef.current === "hinglish" ? "hi" : "en",
      {
        onStart: () => {},
        onBoundary: () => {},
        onEnd: () => {},
      }
    );

    try {
      await step.execute(store, navigate);
    } catch {
      // Continue even if an action encounters network delay
    }

    // Schedule next step based on duration
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (activeRef.current && !pausedRef.current) {
        runStep(index + 1);
      }
    }, step.durationMs);
  };

  const startTour = () => {
    setActive(true);
    setPaused(false);
    setElapsedSec(0);
    workflow.setGuided(false); // supersede standard guided mode
    runStep(0);
  };

  const pauseTour = () => {
    setPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    window.speechSynthesis?.pause();
  };

  const resumeTour = () => {
    setPaused(false);
    window.speechSynthesis?.resume();
    // Continue current step remaining time
    const currentStep = TOUR_STEPS[stepIndex];
    if (currentStep) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (activeRef.current && !pausedRef.current) {
          runStep(stepIndex + 1);
        }
      }, 5000);
    }
  };

  const stopTour = () => {
    setActive(false);
    setPaused(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    stopSpeaking();
  };

  const jumpToStep = (index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      if (timerRef.current) clearTimeout(timerRef.current);
      runStep(index);
    }
  };

  // Elapsed ticker
  useEffect(() => {
    if (!active || paused) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active, paused]);

  // Auto-pause if judge interacts manually with the UI outside tour controls
  useEffect(() => {
    if (!active) return;
    const handleManualClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-tour-control]")) return;
      if (!pausedRef.current) {
        pauseTour();
      }
    };
    window.addEventListener("pointerdown", handleManualClick, true);
    return () => window.removeEventListener("pointerdown", handleManualClick, true);
  }, [active]);

  return (
    <JudgeTourContext.Provider
      value={{
        active,
        stepIndex,
        paused,
        language,
        elapsedSec,
        totalSec,
        startTour,
        pauseTour,
        resumeTour,
        stopTour,
        setLanguage,
        jumpToStep,
      }}
    >
      {children}
    </JudgeTourContext.Provider>
  );
}

export function useJudgeTour() {
  const context = useContext(JudgeTourContext);
  if (!context) throw new Error("useJudgeTour must be used inside JudgeTourProvider");
  return context;
}

export function JudgeTourBanner() {
  const tour = useJudgeTour();
  if (!tour.active) return null;

  const current = TOUR_STEPS[tour.stepIndex];

  return (
    <div
      data-tour-control
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/30 bg-slate-900/95 px-4 py-2 text-white shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
            Autonomous Judge Tour · Step {tour.stepIndex + 1} of {TOUR_STEPS.length}
          </p>
          <p className="text-sm font-semibold">{current?.title}</p>
        </div>
      </div>

      {/* Timeline Step Dots */}
      <div className="hidden sm:flex items-center gap-1.5">
        {TOUR_STEPS.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => tour.jumpToStep(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === tour.stepIndex
                ? "w-7 bg-emerald-400"
                : idx < tour.stepIndex
                ? "w-3 bg-emerald-700 hover:bg-emerald-600"
                : "w-3 bg-slate-700 hover:bg-slate-600"
            }`}
            title={s.title}
          />
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {/* Language switch */}
        <div className="flex rounded border border-slate-700 bg-slate-800 p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => tour.setLanguage("en")}
            className={`px-2 py-0.5 rounded ${tour.language === "en" ? "bg-emerald-600 text-white font-bold" : "text-slate-400"}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => tour.setLanguage("hinglish")}
            className={`px-2 py-0.5 rounded ${tour.language === "hinglish" ? "bg-emerald-600 text-white font-bold" : "text-slate-400"}`}
          >
            Hinglish
          </button>
        </div>

        {/* Pause / Resume */}
        <button
          type="button"
          onClick={tour.paused ? tour.resumeTour : tour.pauseTour}
          className="rounded border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"
        >
          {tour.paused ? "▶ Resume" : "⏸ Pause"}
        </button>

        {/* Stop Tour */}
        <button
          type="button"
          onClick={tour.stopTour}
          className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
        >
          ✕ Exit Tour
        </button>
      </div>
    </div>
  );
}
