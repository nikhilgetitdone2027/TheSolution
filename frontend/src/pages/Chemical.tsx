import { useEffect, useState } from "react";
import { CompositionDonut, HorizontalBars } from "../components/Charts";
import { SourceBadge } from "../components/Shell";
import { MATERIAL_FIELDS, PROCESS_FIELDS, finite } from "../format";
import { useAnalysis } from "../state/AnalysisContext";
import { ChemicalProfileVisual } from "../components/animations/ChemicalProfileVisual";
import { CompositionAnimation } from "../components/animations/CompositionAnimation";
import { MaterialBalance } from "../components/animations/MaterialBalance";
import { PretreatmentAcidGasCard } from "../components/chemical/PretreatmentAcidGasCard";
import { ThermalAutarkyDialCard } from "../components/chemical/ThermalAutarkyDialCard";
import { PonaOilQualityCard } from "../components/chemical/PonaOilQualityCard";
import { SpotlightCard } from "../components/layout/SpotlightCard";
import { AnimatedCounter } from "../components/animations/AnimatedCounter";

const ELEMENT_LABELS: Record<string, string> = {
  carbon_pct: "Carbon",
  hydrogen_pct: "Hydrogen",
  oxygen_pct: "Oxygen",
  nitrogen_pct: "Nitrogen",
  chlorine_pct: "Chlorine",
};

export function Chemical() {
  const { active, profile, loadProfile, saveInputs, model, busy } = useAnalysis();
  const [selected, setSelected] = useState("PE");
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (active) void loadProfile();
  }, [active?.id, JSON.stringify(active?.inputs)]);

  useEffect(() => {
    if (!active) return;
    const next: Record<string, string> = {};
    for (const [key] of PROCESS_FIELDS) {
      const value = active.inputs[key];
      next[key] = value === null || value === undefined ? "" : String(value);
    }
    setDraft(next);
  }, [active?.id]);

  if (!active) return <p>Upload a sample to begin.</p>;

  const rows = MATERIAL_FIELDS.map(([key, label]) => ({
    name: label,
    value: finite(active.inputs[key]) ?? 0,
  }));
  const selectedField = MATERIAL_FIELDS.find(([, label]) => label === selected);
  const selectedValue = selectedField ? finite(active.inputs[selectedField[0]]) : null;
  const elements = profile?.elemental.calculated.elements_wt_pct;
  const elementRows = elements
    ? [
        ...Object.entries(elements).map(([key, value]) => ({ name: ELEMENT_LABELS[key] ?? key, value })),
        { name: "Uncharacterized", value: profile.elemental.calculated.uncharacterized_mass_pct },
      ]
    : [];

  const scientificIntel = profile?.intelligence ?? active?.intelligence ?? active?.pathways?.intelligence;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Feedstock Telemetry & Thermodynamics
          </p>
          <h1 className="font-serif text-4xl font-medium text-ink">Chemical Intelligence</h1>
          <div className="mt-2">
            <SourceBadge label={active.sourceLabel} />
          </div>
        </div>
      </header>

      {/* Module 1: Pretreatment, HCl release & Lime Scrubber */}
      <PretreatmentAcidGasCard contamination={scientificIntel?.contamination} />

      {/* Module 2: Thermodynamics & Thermal Autarky Dial */}
      <ThermalAutarkyDialCard thermodynamics={scientificIntel?.thermodynamics} />

      {/* Module 3: Pyrolysis Oil Quality & PONA Distribution */}
      <PonaOilQualityCard oilQuality={scientificIntel?.oil_quality} />

      {/* Material Composition & Interactive Details */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SpotlightCard as="div" spotlightColor="emerald" className="p-5">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="font-serif text-2xl text-white">Material Composition</h2>
            <span className="text-xs font-mono text-emerald-400">Polymer Mix</span>
          </div>
          <CompositionDonut rows={rows} onSelect={setSelected} />
        </SpotlightCard>

        <SpotlightCard as="div" spotlightColor="cyan" className="p-5">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="font-serif text-2xl text-white">{selected} Properties</h2>
            <span className="text-xs font-mono text-cyan-400">Constituent Detail</span>
          </div>
          <dl className="mt-4 space-y-3.5 text-sm">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-sm">
              <dt className="text-xs font-mono uppercase text-zinc-400">Material fraction</dt>
              <dd className="tabular text-3xl font-bold font-mono text-emerald-400 mt-1">
                <AnimatedCounter value={selectedValue} decimals={1} suffix="%" />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono text-zinc-400">Contribution to sample</dt>
              <dd className="text-zinc-200 mt-0.5">Entered weight percent of the dry blend.</dd>
            </div>
            <div>
              <dt className="text-xs font-mono text-zinc-400">Relevant model inputs</dt>
              <dd className="text-zinc-200 mt-0.5">
                {selected === "Other"
                  ? "Other % is retained for the mass balance and omitted from the model when the fractions sum to 100%."
                  : "Named polymer percentages are model features when present."}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono text-zinc-400">Data source</dt>
              <dd className="text-emerald-400 font-mono mt-0.5">{active.sourceLabel}</dd>
            </div>
          </dl>
        </SpotlightCard>
      </section>

      {/* Composition Breakdown & Material Balance */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SpotlightCard as="div" spotlightColor="emerald" className="p-5">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="font-serif text-2xl text-white">Composition Breakdown</h2>
            <span className="text-xs font-mono text-emerald-400">Flow Visualizer</span>
          </div>
          <CompositionAnimation sample={active} />
        </SpotlightCard>

        <SpotlightCard as="div" spotlightColor="cyan" className="p-5">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h2 className="font-serif text-2xl text-white">Material Balance</h2>
            <span className="text-xs font-mono text-cyan-400">Validation Gate</span>
          </div>
          <MaterialBalance sample={active} validation={active.validation} />
        </SpotlightCard>
      </section>

      {/* Polymer Families */}
      <SpotlightCard as="section" spotlightColor="emerald" className="p-5">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="font-serif text-2xl text-white">Polymer Families Present</h2>
          <span className="text-xs font-mono text-emerald-400">Molecular Hierarchy</span>
        </div>
        <ChemicalProfileVisual sample={active} />
      </SpotlightCard>

      {/* Elemental Contribution */}
      <SpotlightCard as="section" spotlightColor="emerald" className="p-5">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="font-serif text-2xl text-white">Elemental Contribution</h2>
          <span className="text-xs font-mono text-emerald-400">Stoichiometry</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-zinc-300">
          {profile?.elemental.calculated.note} {profile?.elemental.calculated.label}. {profile?.elemental.calculated.basis}.
        </p>
        {elementRows.length ? (
          <HorizontalBars rows={elementRows} unit="%" label="Calculated element contribution, weight percent of sample" />
        ) : (
          <p className="mt-4 text-sm text-zinc-400 font-mono">Profile is loading.</p>
        )}
        {Object.keys(profile?.elemental.uploaded_elements ?? {}).length ? (
          <p className="mt-2 text-xs font-mono text-cyan-400">
            Uploaded elemental values are stored separately and are not overwritten by the calculation.
          </p>
        ) : null}
      </SpotlightCard>

      {/* Process Inputs */}
      <SpotlightCard as="section" spotlightColor="cyan" className="p-5">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="font-serif text-2xl text-white">Process Inputs</h2>
          <span className="text-xs font-mono text-cyan-400">Reactor Operating Boundary</span>
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Editing these values updates the sample and clears the previous prediction. The training range is shown beside each control.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {PROCESS_FIELDS.map(([key, label, unit]) => {
            const featureRange = model?.feature_ranges[key];
            return (
              <label key={key} className="text-sm block rounded-lg bg-white/[0.02] p-3 border border-white/[0.06]">
                <span className="flex items-baseline justify-between font-mono text-xs text-zinc-300">
                  <span className="font-medium text-white">{label}</span>
                  <span className="text-zinc-400">{unit}</span>
                </span>
                <input
                  className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                  inputMode="decimal"
                  value={draft[key] ?? ""}
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                />
                <span className="mt-1.5 block text-[11px] font-mono text-emerald-400">
                  {featureRange ? `Training range ${featureRange.min}–${featureRange.max} ${featureRange.unit}` : "Range appears after the model loads."}
                </span>
              </label>
            );
          })}
        </div>
        <button
          className="mt-5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-mono font-semibold text-white shadow-md transition-all hover:bg-emerald-500 disabled:opacity-50"
          type="button"
          disabled={busy === "inputs"}
          onClick={() => {
            const numeric = Object.fromEntries(
              PROCESS_FIELDS.map(([key]) => [key, draft[key] === "" ? null : Number(draft[key])]),
            );
            void saveInputs(numeric);
          }}
        >
          {busy === "inputs" ? "Saving..." : "Update Sample Inputs"}
        </button>
      </SpotlightCard>
    </div>
  );
}
