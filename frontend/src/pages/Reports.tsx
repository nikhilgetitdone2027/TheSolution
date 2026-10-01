import { useState } from "react";
import { ReportGenerationAnimation } from "../components/animations/ReportGenerationAnimation";
import { useAnalysis } from "../state/AnalysisContext";
import { useWorkflow } from "../workflow/engine";

export function Reports() {
  const { active, createReport, busy, model } = useAnalysis();
  const engine = useWorkflow();
  const [html, setHtml] = useState<string | null>(active?.reportHtml ?? null);
  const [touched, setTouched] = useState(false);
  if (!active) return <p>Upload a sample to begin.</p>;
  const status = touched ? engine.steps.report.status : "idle";
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Report</p>
          <h1 className="font-serif text-4xl font-medium">Reports</h1>
        </div>
        <button
          className="btn bg-pine px-4 py-2 text-sm text-white disabled:opacity-50"
          type="button"
          disabled={busy === "report"}
          onClick={async () => {
            setTouched(true);
            try {
              setHtml(await createReport());
            } catch {
              // The error banner and the report step show the failure.
            }
          }}
        >
          {busy === "report" ? "Writing report" : "Generate report"}
        </button>
      </header>
      {touched ? (
        <section className="border border-line bg-surface p-4" aria-live="polite">
          <ReportGenerationAnimation sample={active} model={model} status={status} />
        </section>
      ) : null}
      {html ? (
        <>
          <a
            className="inline-block border border-line px-3 py-2 text-sm"
            href={`data:text/html;charset=utf-8,${encodeURIComponent(html)}`}
            download={`${active.name.replaceAll(" ", "-")}-report.html`}
          >
            Download HTML
          </a>
          <iframe className="h-[70vh] w-full border border-line bg-white" title="Recovery report preview" srcDoc={html} />
        </>
      ) : (
        <p className="text-sm">Generate a report after the stages you want included have been run.</p>
      )}
    </div>
  );
}
