import { useEffect, useState } from "react";
import { CompositionDonut, HorizontalBars } from "../components/Charts";
import { SourceBadge } from "../components/Shell";
import { MATERIAL_FIELDS, PROCESS_FIELDS, finite, showNumber } from "../format";
import { useAnalysis } from "../state/AnalysisContext";
import { ChemicalProfileVisual } from "../components/animations/ChemicalProfileVisual";
import { CompositionAnimation } from "../components/animations/CompositionAnimation";
import { MaterialBalance } from "../components/animations/MaterialBalance";

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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Profile</p>
        <h1 className="font-serif text-4xl font-medium">Chemical Intelligence</h1>
        <div className="mt-2">
          <SourceBadge label={active.sourceLabel} />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-line bg-surface p-4">
          <h2 className="font-serif text-2xl">Material composition</h2>
          <CompositionDonut rows={rows} onSelect={setSelected} />
        </div>
        <div className="border border-line bg-surface p-4">
          <h2 className="font-serif text-2xl">{selected}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Material fraction</dt>
              <dd className="tabular text-2xl">{showNumber(selectedValue, 1, "%")}</dd>
            </div>
            <div>
              <dt className="text-muted">Contribution to sample</dt>
              <dd>Entered weight percent of the dry blend.</dd>
            </div>
            <div>
              <dt className="text-muted">Relevant model inputs</dt>
              <dd>{selected === "Other" ? "Other % is retained for the mass balance and omitted from the model when the fractions sum to 100%." : "Named polymer percentages are model features when present."}</dd>
            </div>
            <div>
              <dt className="text-muted">Data source</dt>
              <dd>{active.sourceLabel}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-line bg-surface p-4">
          <h2 className="mb-3 font-serif text-2xl">Composition breakdown</h2>
          <CompositionAnimation sample={active} />
        </div>
        <div className="border border-line bg-surface p-4">
          <h2 className="mb-3 font-serif text-2xl">Material balance</h2>
          <MaterialBalance sample={active} validation={active.validation} />
        </div>
      </section>

      <section className="border border-line bg-surface p-4">
        <h2 className="mb-3 font-serif text-2xl">Polymer families present</h2>
        <ChemicalProfileVisual sample={active} />
      </section>

      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Elemental contribution</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          {profile?.elemental.calculated.note} {profile?.elemental.calculated.label}. {profile?.elemental.calculated.basis}.
        </p>
        {elementRows.length ? <HorizontalBars rows={elementRows} unit="%" label="Calculated element contribution, weight percent of sample" /> : <p className="mt-4 text-sm">Profile is loading.</p>}
        {Object.keys(profile?.elemental.uploaded_elements ?? {}).length ? (
          <p className="text-sm">Uploaded elemental values are stored separately and are not overwritten by the calculation.</p>
        ) : null}
      </section>

      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Process inputs</h2>
        <p className="mt-2 text-sm text-muted">Editing these values updates the sample and clears the previous prediction. The training range is shown beside each control.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {PROCESS_FIELDS.map(([key, label, unit]) => {
            const featureRange = model?.feature_ranges[key];
            return (
              <label key={key} className="text-sm">
                <span className="flex items-baseline justify-between">
                  <span>{label}</span>
                  <span className="text-muted">{unit}</span>
                </span>
                <input
                  className="mt-1 w-full border border-line bg-paper px-3 py-2"
                  inputMode="decimal"
                  value={draft[key] ?? ""}
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                />
                <span className="mt-1 block text-xs text-muted">
                  {featureRange ? `Training range ${featureRange.min}–${featureRange.max} ${featureRange.unit}` : "Range appears after the model loads."}
                </span>
              </label>
            );
          })}
        </div>
        <button
          className="mt-4 bg-pine px-4 py-2 text-sm text-white disabled:opacity-50"
          type="button"
          disabled={busy === "inputs"}
          onClick={() => {
            const numeric = Object.fromEntries(
              PROCESS_FIELDS.map(([key]) => [key, draft[key] === "" ? null : Number(draft[key])]),
            );
            void saveInputs(numeric);
          }}
        >
          Update sample inputs
        </button>
      </section>
    </div>
  );
}
