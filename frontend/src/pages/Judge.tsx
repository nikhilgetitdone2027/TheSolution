import { useNavigate } from "react-router-dom";
import { JUDGE_STEPS, useJudgeAdvance } from "../judgeFlow";
import { useAnalysis } from "../state/AnalysisContext";
import { useGuidedDemo } from "../workflow/GuidedDemo";

export function Judge() {
  const store = useAnalysis();
  const navigate = useNavigate();
  const { next, step } = useJudgeAdvance();
  const guided = useGuidedDemo();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-copper">Judge mode</p>
        <h1 className="font-serif text-4xl font-medium">Launch Judge Demo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6">{step?.copy}</p>
      </header>
      <section className="border border-ink bg-surface p-4">
        <h2 className="font-serif text-2xl">Guided demo</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6">
          Twelve narrated scenes, from sample to summary, driven by a real analysis of {`"Mixed Plastic Batch #001"`}. Click anywhere outside the demo controls to pause.
        </p>
        <button className="btn mt-3 bg-ink px-4 py-2 text-sm text-white disabled:opacity-50" type="button" disabled={guided.running} onClick={guided.start}>
          ▶ Start Guided Demo
        </button>
      </section>
      <ol className="grid gap-2 md:grid-cols-5">
        {JUDGE_STEPS.map((item, index) => (
          <li key={item.title} className={`border px-3 py-2 text-sm ${store.judgeActive && index === store.judgeStep ? "border-ink bg-surface" : "border-line"}`}>
            <span className="font-mono text-xs text-muted">{String(index).padStart(2, "0")}</span>
            <span className="mt-1 block">{item.title}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button className="bg-ink px-4 py-2 text-sm text-white" type="button" onClick={() => { store.setJudge(true, 0); navigate("/app/judge"); }}>
          Launch Judge Demo
        </button>
        <button className="bg-pine px-4 py-2 text-sm text-white disabled:opacity-50" type="button" disabled={!store.judgeActive || store.judgeStep >= JUDGE_STEPS.length - 1 || Boolean(store.busy)} onClick={() => next()}>
          {store.busy ? "Working…" : "Next"}
        </button>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Next performs the stage, then opens it. The same Next control stays in the top bar. Where am I: {step?.title}.
      </p>
    </div>
  );
}
