import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAnalysis } from "../../state/AnalysisContext";
import { useWorkflow, workflow } from "../../workflow/engine";
import { bus } from "../../workflow/events";
import { transitionTo } from "../../workflow/transition";
import { narrationFor } from "./narration";
import { SaathiActionCard, type Activity } from "./SaathiActionCard";
import { SaathiAvatar } from "./SaathiAvatar";
import { avatarStatusText, deriveAvatarState, type LocalState } from "./SaathiState";
import { speakText, speechToTextSupported, startListening, stopSpeaking, textToSpeechSupported, voiceAvailable, type SpeechLanguage } from "./SaathiVoice";
import { detectVoiceIntent } from "../../saathi/tools/intentDetector";

type Preference = "auto" | SpeechLanguage;

const ROUTES: Record<string, string> = {
  overview: "/app",
  samples: "/app/samples",
  chemical: "/app/chemical",
  predictions: "/app/predictions",
  pathways: "/app/pathways",
  optimize: "/app/optimize",
  what_if_lab: "/app/simulate",
  carbon: "/app/carbon",
  impact: "/app/impact",
  reports: "/app/reports",
  trust: "/app/trust",
  judge: "/app/judge",
  settings: "/app/settings",
};

const ROUTE_NAMES: Record<string, string> = {
  overview: "Overview",
  samples: "Waste Samples",
  chemical: "Chemical Intelligence",
  predictions: "AI Predictions",
  pathways: "Pathway Comparison",
  optimize: "Pathway Optimizer",
  what_if_lab: "What-If Lab",
  carbon: "Carbon Intelligence",
  impact: "Impact",
  reports: "Reports",
  trust: "Model Trust",
  judge: "Demo Mode",
  settings: "Settings",
};

const PROMPTS: Record<string, string[]> = {
  chemical: ["Explain this composition", "What does PVC mean here?", "Which inputs matter most?"],
  predictions: ["Explain this prediction", "What affects oil yield?", "How confident is the model?"],
  optimize: ["Why this objective?", "Show alternatives", "What assumptions are being used?"],
  what_if_lab: ["What changed?", "Compare before and after", "Explain this parameter"],
  impact: ["How was this estimate calculated?", "What is measured vs predicted?"],
  carbon: ["How was this estimate calculated?", "What is measured vs predicted?"],
};

function pageId(pathname: string): string {
  const match = Object.entries(ROUTES).find(([, route]) => route !== "/app" && pathname.endsWith(route.replace("/app", "")));
  return match ? match[0] : "overview";
}

function greeting(language: Preference): string {
  if (language === "en") {
    return "Hello. I'm Saathi. I can walk you from the waste composition through the model prediction to the recovery decision.";
  }
  if (language === "hi") {
    return "नमस्ते। मैं Saathi हूँ। मैं CHEM2ENERGY में waste composition से recovery decision तक की प्रक्रिया समझा सकता हूँ।";
  }
  return "Namaste. Main Saathi hoon. Main aapko CHEM2ENERGY ke through waste composition se recovery decisions tak ka complete process samjha sakta hoon.";
}

export function SaathiChat() {
  const store = useAnalysis();
  const engine = useWorkflow();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<Preference>("auto");
  const [draft, setDraft] = useState("");
  const [spoken, setSpoken] = useState<SpeechLanguage>("hinglish");
  const [lines, setLines] = useState<string[]>([greeting("auto")]);
  const [local, setLocal] = useState<LocalState>("idle");
  const [mouth, setMouth] = useState(0.2);
  const [muted, setMuted] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [now, setNow] = useState(Date.now());
  const [voiceNote, setVoiceNote] = useState(voiceAvailable() ? "" : "Voice service unavailable. You can continue chatting with Saathi.");
  const listenRef = useRef<{ stop: () => void } | null>(null);
  const lastRef = useRef(greeting("auto"));
  const greeted = useRef(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const live = useRef({ open, muted, preference, spoken, store });
  live.current = { open, muted, preference, spoken, store };

  const page = pageId(location.pathname);
  const prompts = PROMPTS[page] ?? ["Why is pyrolysis being considered?", "What data is missing?", "Explain this prediction"];
  const avatarState = deriveAvatarState(local, engine, now);
  const docked = engine.guided;

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: "nearest" });
  }, [lines, local]);

  useEffect(() => {
    if (!engine.completedAt) return;
    setNow(Date.now());
    const timer = window.setTimeout(() => setNow(Date.now()), 4200);
    return () => window.clearTimeout(timer);
  }, [engine.completedAt]);

  function speak(text: string, language: SpeechLanguage, interrupt = true): Promise<void> {
    lastRef.current = text;
    setSpoken(language);
    if (live.current.muted || !textToSpeechSupported()) {
      setLocal("idle");
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      speakText(
        text,
        language,
        {
          onStart: () => setLocal("speaking"),
          onBoundary: setMouth,
          onEnd: () => {
            setMouth(0.15);
            setLocal((current) => (current === "speaking" ? "idle" : current));
            resolve();
          },
        },
        interrupt,
      );
    });
  }

  useEffect(() => {
    workflow.setNarrator(async (cue) => {
      const current = live.current;
      if (!current.open && !cue.engine.guided) return;
      const language: SpeechLanguage = current.preference === "auto" ? current.spoken : current.preference;
      const sample = current.store.samples.find((item) => item.id === cue.engine.sampleId) ?? current.store.active;
      const text = narrationFor(cue.id, language, { engine: cue.engine, sample, model: current.store.model });
      if (!text) return;
      workflow.setCaption(text);
      setLines((existing) => [...existing, text]);
      await speak(text, language, false);
    });
    const off = bus.on("simulation:complete", () => {
      if (live.current.open && !workflow.getSnapshot().guided) void workflow.narrate("whatif");
    });
    return () => {
      workflow.setNarrator(null);
      off();
    };
    // Registered once. Live values are read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engine.guided) setOpen(true);
  }, [engine.guided]);

  async function ask(message: string, language: Preference = preference) {
    const trimmed = message.trim();
    if (!trimmed) return;
    listenRef.current?.stop();
    stopSpeaking();
    setLines((current) => [...current, trimmed]);

    // Check for hands-free voice-driven action execution
    const tempRange = store.model?.optimization_boundary.ranges.temperature_c ?? { min: 400, max: 700 };
    const intentResult = detectVoiceIntent(trimmed, tempRange);
    const langKey = language === "en" ? "en" : language === "hi" ? "hi" : "hinglish";

    if (intentResult.matched) {
      const responseText = intentResult.feedback[langKey] ?? intentResult.feedback.en;
      setLines((current) => [...current, responseText]);

      if (intentResult.intent === "set_temperature" && intentResult.value !== undefined) {
        setActivity({ label: `Setting temperature to ${intentResult.value}°C`, tools: ["whatif_simulator"], state: "running" });
        transitionTo(navigate, "/app/simulate");
        void speak(responseText, language === "auto" ? "hinglish" : language);
        try {
          await store.simulate({ temperature_c: intentResult.value });
          setActivity({ label: `Simulation updated for ${intentResult.value}°C`, tools: ["whatif_simulator"], state: "done" });
        } catch {
          setActivity({ label: "Simulation failed", tools: [], state: "error" });
        }
        return;
      }

      if (intentResult.intent === "run_analysis") {
        setActivity({ label: "Executing ML prediction engine", tools: ["ml_surrogate"], state: "running" });
        void speak(responseText, language === "auto" ? "hinglish" : language);
        if (store.active) {
          try {
            await store.analyze();
            await workflow.whenSettled();
            transitionTo(navigate, "/app/predictions");
            setActivity({ label: "Analysis complete", tools: ["ml_surrogate"], state: "done" });
          } catch {
            setActivity({ label: "Analysis failed", tools: [], state: "error" });
          }
        }
        return;
      }

      if (intentResult.intent === "download_report") {
        setActivity({ label: "Generating techno-economic report", tools: ["report_generator"], state: "running" });
        void speak(responseText, language === "auto" ? "hinglish" : language);
        transitionTo(navigate, "/app/reports");
        try {
          await store.createReport();
          setActivity({ label: "Report ready", tools: ["report_generator"], state: "done" });
        } catch {
          setActivity({ label: "Report generation failed", tools: [], state: "error" });
        }
        return;
      }

      if (intentResult.intent === "open_what_if") {
        void speak(responseText, language === "auto" ? "hinglish" : language);
        transitionTo(navigate, "/app/simulate");
        return;
      }

      if (intentResult.intent === "chemical_question") {
        setLines((current) => [...current, responseText]);
        setActivity({
          label:
            intentResult.questionType === "hcl_risk"
              ? "Stoichiometric Acid Gas Scrubber sizing"
              : intentResult.questionType === "energy_positive"
              ? "Thermodynamics & Energy Autarky balance"
              : "Pyrolysis Oil H/C & PONA Refinery Assessment",
          tools: ["stoichiometry", "thermodynamics", "oil_quality"],
          state: "done",
        });
        void speak(responseText, language === "auto" ? "hinglish" : language);
        return;
      }
    }

    setLocal("thinking");
    setActivity({ label: "Reading application data", tools: [], state: "running" });
    try {
      const result = await api.saathi({
        message: trimmed,
        language,
        page,
        sampleId: store.active?.id,
        simulation: store.scenario,
      });
      setLines((current) => [...current, result.text]);
      const navigation = result.actions.find((action) => action.type === "navigate");
      const runs = result.actions.some((action) => action.type === "run_analysis");
      setActivity({
        label: runs ? "Running analysis" : navigation && navigation.type === "navigate" ? `Opening ${ROUTE_NAMES[navigation.page] ?? navigation.page}` : "Answered from current data",
        tools: result.toolsUsed,
        state: runs ? "running" : "done",
      });
      const speaking = speak(result.text, result.language);
      if (navigation && navigation.type === "navigate" && ROUTES[navigation.page] && !runs) {
        transitionTo(navigate, ROUTES[navigation.page] ?? "/app");
      }
      if (runs && store.active) {
        await speaking;
        await store.analyze();
        await workflow.whenSettled();
        setActivity({ label: "Analysis complete", tools: result.toolsUsed, state: "done" });
        transitionTo(navigate, "/app/predictions");
      }
    } catch {
      setLocal("error");
      setActivity({ label: "Request failed", tools: [], state: "error" });
      setLines((current) => [...current, "I couldn't complete that request. You can try again or use text."]);
    }
  }

  function talk() {
    if (!speechToTextSupported()) {
      setVoiceNote("Voice service unavailable. You can continue chatting with Saathi.");
      return;
    }
    setVoiceNote("");
    setLocal("listening");
    const heard = preference === "auto" ? spoken : preference;
    listenRef.current = startListening(
      heard,
      (text) => {
        setDraft(text);
        void ask(text);
      },
      () => setLocal((current) => (current === "listening" ? "idle" : current)),
    );
  }

  function openPanel() {
    setOpen(true);
    if (greeted.current) return;
    greeted.current = true;
    const language: SpeechLanguage = preference === "en" ? "en" : preference === "hi" ? "hi" : "hinglish";
    void speak(greeting(preference), language);
  }

  function chooseLanguage(next: Preference) {
    setPreference(next);
    const line = greeting(next);
    setLines([line]);
    lastRef.current = line;
    setSpoken(next === "auto" ? "hinglish" : next);
  }

  const controls = (
    <div className="mb-2 flex flex-wrap gap-3 text-xs">
      {docked ? null : (
        <button type="button" onClick={talk}>
          🎙 Talk
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setMuted((value) => !value);
          stopSpeaking();
        }}
      >
        {muted ? "Unmute" : "Mute"}
      </button>
      <button
        type="button"
        onClick={() => {
          stopSpeaking();
          setLocal("idle");
        }}
      >
        Stop speaking
      </button>
      <button type="button" onClick={() => void speak(lastRef.current, spoken)}>
        Replay
      </button>
    </div>
  );

  if (docked) {
    return (
      <aside className="saathi-dock" aria-label="Saathi narration" data-guided-ui>
        <div className="flex items-start gap-3">
          <SaathiAvatar state={avatarState} mouth={mouth} size="small" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Saathi · {avatarStatusText(avatarState)}</p>
            <p className="mt-1 text-sm leading-5" aria-live="polite">
              {engine.caption ?? "Starting the guided demo."}
            </p>
          </div>
        </div>
        <div className="mt-2">{controls}</div>
      </aside>
    );
  }

  return (
    <>
      {open ? null : (
        <button className="saathi-launch" type="button" onClick={() => openPanel()}>
          <span className={`saathi-launch-dot is-${avatarState}`} aria-hidden />
          Talk to Saathi
        </button>
      )}
      {open ? (
        <section className="saathi-panel" aria-label="Saathi" data-guided-ui>
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">CHEM2ENERGY</p>
              <h2 className="font-serif text-2xl">Saathi</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`saathi-live ${avatarState === "error" ? "is-error" : ""}`}>{avatarState === "error" ? "Retry" : "Live"}</span>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setOpen(false);
                }}
                aria-label="Close Saathi"
              >
                Close
              </button>
            </div>
          </header>
          <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
            <SaathiAvatar state={avatarState} mouth={mouth} />
            <p className="text-center text-sm text-muted" aria-live="polite">
              {avatarStatusText(avatarState)}
            </p>
            <SaathiActionCard activity={activity} />
            <div className="flex justify-center gap-2">
              {(["en", "hi", "hinglish"] as const).map((item) => (
                <button key={item} className={`chip ${preference === item ? "is-on" : ""}`} type="button" onClick={() => chooseLanguage(item)}>
                  {item === "en" ? "English" : item === "hi" ? "हिंदी" : "Hinglish"}
                </button>
              ))}
              <button className={`chip ${preference === "auto" ? "is-on" : ""}`} type="button" onClick={() => chooseLanguage("auto")}>
                Auto
              </button>
            </div>
            {voiceNote ? <p className="text-sm text-warn">{voiceNote}</p> : null}
            <div className="space-y-3">
              {lines.slice(-4).map((line, index) => (
                <p key={`${lines.length}-${index}`} className="text-sm leading-6 fade-up">
                  {line}
                </p>
              ))}
              <div ref={transcriptEnd} />
            </div>
            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button key={prompt} className="chip text-left" type="button" onClick={() => void ask(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <form
            className="border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              const next = draft;
              setDraft("");
              void ask(next);
            }}
          >
            {controls}
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 border border-line bg-paper px-3 py-2 text-sm"
                value={draft}
                placeholder="Type a question..."
                aria-label="Type a question"
                onChange={(event) => setDraft(event.target.value)}
              />
              <button className="bg-pine px-3 text-white" type="submit" aria-label="Send">
                ➤
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
