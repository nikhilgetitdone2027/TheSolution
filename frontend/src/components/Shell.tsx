import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { workflow } from "../workflow/engine";
import { useJudgeAdvance } from "../judgeFlow";
import { useAnalysis } from "../state/AnalysisContext";
import { formatNumber } from "../format";
import { GuidedDemoBar } from "../workflow/GuidedDemo";
import { JudgeTourBanner, useJudgeTour } from "../workflow/JudgeTourController";
import { AnalysisTheater, TheaterReopen } from "./animations/AnalysisTheater";

const LINKS: Array<{ to: string; label: string; end?: boolean; needs?: "sample" | "prediction" | "pathways" | "optimized" }> = [
  { to: "/app", label: "Overview", end: true },
  { to: "/app/samples", label: "Waste Samples" },
  { to: "/app/chemical", label: "Chemical Intelligence", needs: "sample" },
  { to: "/app/predictions", label: "AI Predictions", needs: "prediction" },
  { to: "/app/pathways", label: "Pathway Comparison", needs: "pathways" },
  { to: "/app/optimize", label: "Pathway Optimizer", needs: "prediction" },
  { to: "/app/simulate", label: "What-If Lab", needs: "optimized" },
  { to: "/app/carbon", label: "Carbon Intelligence", needs: "sample" },
  { to: "/app/impact", label: "Impact", needs: "prediction" },
  { to: "/app/reports", label: "Reports", needs: "sample" },
  { to: "/app/trust", label: "Model Trust" },
];

function allowed(needs: (typeof LINKS)[number]["needs"], active: ReturnType<typeof useAnalysis>["active"]) {
  if (!needs) return { ok: true, reason: "" };
  if (needs === "sample") return { ok: Boolean(active), reason: "Upload a sample to begin." };
  if (needs === "prediction") return { ok: Boolean(active?.prediction?.available), reason: "Run AI analysis to open this stage." };
  if (needs === "pathways") return { ok: Boolean(active?.pathways), reason: "Run AI analysis to compare pathways." };
  return { ok: Boolean(active?.optimization?.available), reason: "Run optimization before opening the What-If Lab." };
}

function confidenceLabel(active: ReturnType<typeof useAnalysis>["active"]) {
  if (!active?.prediction) return "—";
  if (!active.prediction.available) return "Unavailable";
  const spread = active.prediction.ensemble_spread;
  if (!spread) return "Not available";
  const values = Object.values(spread).map((item) => item.std_percentage_points);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `Tree spread ±${mean.toFixed(1)} pp`;
}

export function Shell({ children }: { children: ReactNode }) {
  const store = useAnalysis();
  const judge = useJudgeAdvance();
  const judgeTour = useJudgeTour();
  const [open, setOpen] = useState(false);
  const quality = store.active?.validation?.quality_score;
  const location = useLocation();

  useEffect(() => {
    if (workflow.getSnapshot().status !== "running") workflow.setTheater(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[240px_1fr]">
      <aside className={`${open ? "block" : "hidden"} border-b border-white/10 bg-sidebar text-[#efe8dc] md:block md:min-h-screen`}>
        <div className="px-5 py-6">
          <p className="font-serif text-xl tracking-tight">CHEM2ENERGY</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#c8bfae]">Recovery decisions</p>
        </div>
        <nav className="px-3 pb-6" aria-label="Primary">
          {LINKS.map((link) => {
            const gate = allowed(link.needs, store.active);
            const className = "mb-1 block border-l-2 border-transparent px-3 py-2 text-sm text-[#d9d1c3]";
            if (!gate.ok) {
              return (
                <span key={link.to} className={`${className} cursor-not-allowed opacity-45`} title={gate.reason}>
                  {link.label}
                </span>
              );
            }
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `${className} ${isActive ? "border-copper bg-white/5 text-white" : "hover:bg-white/5"}`
                }
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 px-3 py-4">
          <NavLink to="/app/judge" className="block px-3 py-2 text-sm text-[#d9d1c3]" onClick={() => setOpen(false)}>
            Demo Mode
          </NavLink>
          <NavLink to="/app/settings" className="block px-3 py-2 text-sm text-[#d9d1c3]" onClick={() => setOpen(false)}>
            Settings
          </NavLink>
        </div>
      </aside>
      <div className="min-w-0">
        <JudgeTourBanner />
        <header className="border-b border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
            <button className="border border-line px-3 py-1 text-sm md:hidden" type="button" onClick={() => setOpen((value) => !value)}>
              Menu
            </button>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <Status label="Current sample" value={store.active?.name ?? "None loaded"} />
              <Status label="Model status" value={store.model ? `Ready · ${store.model.selected.model}` : "Not loaded"} />
              <Status label="Data quality" value={quality === undefined ? "—" : `${formatNumber(quality, 0)}%`} />
              <Status label="AI confidence" value={confidenceLabel(store.active)} />
            </div>
            {/* Prominent Start Judge Tour CTA */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={judgeTour.startTour}
                className="btn flex items-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:from-emerald-500 hover:to-teal-600 transition-all hover:scale-[1.02]"
                title="Start 1-Click Autonomous Judge Presentation Tour (~90-100s)"
              >
                <span className="text-amber-300">⚡</span> Start Judge Tour
              </button>
            </div>
          </div>
          {store.judgeActive ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#f3efe4] px-4 py-2 text-sm md:px-6">
              <p>
                <span className="font-medium">Judge mode</span>
                <span className="text-muted"> · Step {store.judgeStep + 1} of 10 · {judge.step?.title}</span>
              </p>
              <div className="flex gap-2">
                <button
                  className="bg-pine px-3 py-1 text-white disabled:opacity-50"
                  type="button"
                  disabled={store.judgeStep >= 9 || Boolean(store.busy)}
                  onClick={() => judge.next()}
                >
                  {store.busy ? "Working…" : "Next"}
                </button>
                <button className="border border-line px-3 py-1" type="button" onClick={() => store.setJudge(false)}>
                  Exit
                </button>
              </div>
            </div>
          ) : null}
          {store.error ? (
            <div className="toast-in flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2 text-sm md:px-6" role="alert">
              <p>{store.error}</p>
              <button className="border border-line px-3 py-1" type="button" onClick={() => store.clearError()}>
                Dismiss
              </button>
            </div>
          ) : null}
        </header>
        <GuidedDemoBar />
        <main className="space-y-6 px-4 py-6 md:px-8 md:py-8">
          <AnalysisTheater />
          <TheaterReopen />
          {children}
        </main>
      </div>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border border-line bg-surface shadow-card">
      <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
        <div>
          {eyebrow ? <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{eyebrow}</p> : null}
          <h2 className="font-serif text-xl font-medium">{title}</h2>
        </div>
        {action}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function SourceBadge({ label }: { label: string }) {
  return <p className="text-sm text-muted">Source: {label}</p>;
}

export function QualityMeter({ score }: { score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>Data quality</span>
        <span className="tabular font-medium">{formatNumber(score, 0)}%</span>
      </div>
      <div className="h-2 bg-paper2" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Data quality">
        <div className="h-2 bg-pine" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

export function Kind({ children }: { children: ReactNode }) {
  return <span className="text-xs uppercase tracking-[0.12em] text-muted">{children}</span>;
}
