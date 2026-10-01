import { useState } from "react";
import { useAnalysis } from "../state/AnalysisContext";

const PROMPTS = [
  "What does this sample contain?",
  "Why is pyrolysis being considered?",
  "What changed when I increased temperature?",
  "What variables are most influential?",
  "What data is missing?",
  "Explain this model to a non-technical operator.",
];

export function Assistant() {
  const { active, ask, busy } = useAnalysis();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(PROMPTS[0]);
  const [answer, setAnswer] = useState<string | null>(null);

  async function submit(next = question) {
    setQuestion(next);
    const text = await ask(next);
    setAnswer(text);
    setOpen(true);
  }

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-20 bg-ink px-4 py-2 text-sm text-[#f7f4ee]"
        type="button"
        onClick={() => setOpen(true)}
      >
        ChemAI Assistant
      </button>
      {open ? (
        <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-card" role="dialog" aria-label="ChemAI Assistant">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Interpretation layer</p>
              <h2 className="font-serif text-xl">ChemAI</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
              Close
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
            <p className="text-sm leading-6 text-muted">
              Answers use the loaded sample, the model output, and computed feature importance. This assistant does not replace the prediction model.
            </p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <button key={prompt} className="border border-line px-2 py-1 text-left text-xs" type="button" onClick={() => submit(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            {answer ? <p className="text-sm leading-6">{answer}</p> : null}
          </div>
          <form
            className="border-t border-line p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="text-xs uppercase tracking-[0.12em] text-muted" htmlFor="ask">
              Question
            </label>
            <textarea
              id="ask"
              className="mt-2 w-full border border-line bg-paper px-3 py-2 text-sm"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              disabled={!active}
            />
            <button className="mt-3 bg-pine px-4 py-2 text-sm text-white disabled:opacity-50" type="submit" disabled={!active || busy === "ask"}>
              {busy === "ask" ? "Reading evidence…" : "Ask"}
            </button>
            {!active ? <p className="mt-2 text-sm">Upload a sample to begin.</p> : null}
          </form>
        </div>
      ) : null}
    </>
  );
}
