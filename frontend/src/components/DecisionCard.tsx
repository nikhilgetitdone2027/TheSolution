import type { Optimization } from "../types";
import { showNumber } from "../format";

export function DecisionCard({
  optimization,
  sampleName,
  onEvidence,
  onWhatIf,
  onReport,
}: {
  optimization: Optimization | null;
  sampleName: string;
  onEvidence: () => void;
  onWhatIf: () => void;
  onReport: () => void;
}) {
  if (!optimization?.available || !optimization.decision) {
    return (
      <section className="border border-line bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">CHEM2ENERGY decision</p>
        <h2 className="mt-2 font-serif text-2xl">No recommendation yet</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {optimization?.reason ?? "A configuration is shown only after the optimizer evaluates points inside the training range."}
        </p>
      </section>
    );
  }
  const decision = optimization.decision;
  return (
    <section className="border border-ink bg-surface p-5 md:p-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-copper">CHEM2ENERGY decision</p>
      <h2 className="mt-2 font-serif text-3xl font-medium">Configuration to evaluate</h2>
      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted">Sample</dt>
          <dd>{sampleName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted">Model status</dt>
          <dd>Trained · {decision.model}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted">Pathway under study</dt>
          <dd>{decision.pathway_under_study}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted">Objective</dt>
          <dd>{decision.objective}</dd>
        </div>
      </dl>
      <p className="mt-4 max-w-3xl text-sm leading-6">{decision.statement}</p>
      <p className="mt-3 text-sm text-muted">
        Proxy result {showNumber(decision.score, 1)} · {decision.proxy}
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
        {decision.evidence.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="bg-pine px-4 py-2 text-sm text-white" type="button" onClick={onEvidence}>
          View evidence
        </button>
        <button className="border border-line px-4 py-2 text-sm" type="button" onClick={onWhatIf}>
          Run what-if
        </button>
        <button className="border border-line px-4 py-2 text-sm" type="button" onClick={onReport}>
          Generate report
        </button>
      </div>
    </section>
  );
}
