import type { ScientificIntelligence } from "../../types";

interface PonaOilQualityCardProps {
  oilQuality?: ScientificIntelligence["oil_quality"];
}

export function PonaOilQualityCard({ oilQuality }: PonaOilQualityCardProps) {
  if (!oilQuality) {
    return (
      <div className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Pyrolysis Oil Quality & PONA</h2>
        <p className="mt-2 text-sm text-muted">Calculating hydrocarbon distributions...</p>
      </div>
    );
  }

  const { hc_ratio, pona, refinery_verdict, oil_elemental } = oilQuality;

  return (
    <article className="border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Module 3 · Pyrolysis Oil Quality & PONA</p>
          <h2 className="font-serif text-2xl font-medium">Refinery Upgrading Classification & PONA Distribution</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium ${
              hc_ratio.color_badge === "emerald"
                ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30"
                : hc_ratio.color_badge === "amber"
                ? "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/30"
                : "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30"
            }`}
          >
            H/C: {hc_ratio.hc_atomic_ratio} · {hc_ratio.classification}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* PONA Stacked Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-medium text-ink">ASTM D5443 PONA Hydrocarbon Distribution</span>
            <span>Total: {pona.pona_sum_pct}%</span>
          </div>

          <div className="mt-2 flex h-5 w-full overflow-hidden rounded-md border border-line">
            <div
              className="bg-emerald-600 transition-all"
              style={{ width: `${pona.paraffins_pct}%` }}
              title={`Paraffins: ${pona.paraffins_pct}%`}
            />
            <div
              className="bg-teal-500 transition-all"
              style={{ width: `${pona.olefins_pct}%` }}
              title={`Olefins: ${pona.olefins_pct}%`}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${pona.aromatics_pct}%` }}
              title={`Aromatics: ${pona.aromatics_pct}%`}
            />
            <div
              className="bg-slate-400 transition-all"
              style={{ width: `${pona.naphthenes_oxygenates_pct}%` }}
              title={`Naphthenes/Oxygenates: ${pona.naphthenes_oxygenates_pct}%`}
            />
          </div>

          {/* Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-emerald-600" />
              <span>Paraffins: {pona.paraffins_pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-teal-500" />
              <span>Olefins: {pona.olefins_pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-amber-500" />
              <span>Aromatics: {pona.aromatics_pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-slate-400" />
              <span>Naphthenes/O₂: {pona.naphthenes_oxygenates_pct}%</span>
            </div>
          </div>
        </div>

        {/* Refinery Routing Verdict Card */}
        <div className="rounded-lg border border-line bg-panel/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
              Refinery Routing Verdict
            </span>
            <span className="rounded bg-pine/10 px-2 py-0.5 text-[11px] font-mono font-medium text-pine">
              {refinery_verdict.tier}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-ink">
            {refinery_verdict.verdict}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted border-t border-line/50 pt-2">
            <span>Oil C wt%: <strong className="text-ink">{oil_elemental.C_oil_wt}%</strong></span>
            <span>Oil H wt%: <strong className="text-ink">{oil_elemental.H_oil_wt}%</strong></span>
            <span>
              Hydrotreatment:{" "}
              <strong className={refinery_verdict.hydrotreatment_mandatory ? "text-amber-700" : "text-emerald-700"}>
                {refinery_verdict.hydrotreatment_mandatory ? "Mandatory" : "Optional (< 10% blend)"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
