import type { Optimization } from "../types";
import { showNumber } from "../format";
import { SpotlightCard } from "./layout/SpotlightCard";

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
      <SpotlightCard as="section" className="p-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
          CHEM2ENERGY decision
        </p>
        <h2 className="mt-2 font-serif text-2xl text-white">No recommendation yet</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          {optimization?.reason ??
            "A configuration is shown only after the optimizer evaluates points inside the training range."}
        </p>
      </SpotlightCard>
    );
  }

  const decision = optimization.decision;
  return (
    <SpotlightCard as="section" spotlightColor="emerald" className="p-5 md:p-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            CHEM2ENERGY AI Optimization Engine
          </p>
          <h2 className="mt-1 font-serif text-3xl font-medium text-white">
            Recommended Configuration to Evaluate
          </h2>
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 font-mono text-xs text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          Pareto Optimal
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm">
          <dt className="text-xs uppercase tracking-[0.12em] text-zinc-400">Sample</dt>
          <dd className="mt-1 font-medium text-white">{sampleName}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm">
          <dt className="text-xs uppercase tracking-[0.12em] text-zinc-400">Model status</dt>
          <dd className="mt-1 font-mono text-emerald-400">Trained · {decision.model}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm">
          <dt className="text-xs uppercase tracking-[0.12em] text-zinc-400">Pathway under study</dt>
          <dd className="mt-1 font-medium text-cyan-300">{decision.pathway_under_study}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm">
          <dt className="text-xs uppercase tracking-[0.12em] text-zinc-400">Objective</dt>
          <dd className="mt-1 font-medium text-amber-300">{decision.objective}</dd>
        </div>
      </dl>

      <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-200">{decision.statement}</p>
      <p className="mt-2 text-xs font-mono text-emerald-400">
        Proxy score {showNumber(decision.score, 1)} · {decision.proxy}
      </p>

      <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/30 p-3">
        <p className="text-xs font-mono uppercase text-zinc-400 mb-2">Supporting Evidence:</p>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-300">
          {decision.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-mono font-semibold text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-500 hover:scale-[1.02]"
          type="button"
          onClick={onEvidence}
        >
          View Evidence
        </button>
        <button
          className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-mono text-zinc-200 transition-all hover:bg-white/[0.1] hover:text-white"
          type="button"
          onClick={onWhatIf}
        >
          Run What-If
        </button>
        <button
          className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-mono text-zinc-200 transition-all hover:bg-white/[0.1] hover:text-white"
          type="button"
          onClick={onReport}
        >
          Generate Report
        </button>
      </div>
    </SpotlightCard>
  );
}
