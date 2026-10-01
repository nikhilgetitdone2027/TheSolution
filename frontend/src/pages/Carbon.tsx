import { useEffect } from "react";
import { HorizontalBars } from "../components/Charts";
import { useAnalysis } from "../state/AnalysisContext";
import { showNumber } from "../format";
import { CarbonAvailability } from "../components/animations/CarbonAvailability";

export function Carbon() {
  const { active, profile, loadProfile } = useAnalysis();
  useEffect(() => {
    if (active) void loadProfile();
  }, [active?.id, JSON.stringify(active?.inputs)]);
  if (!active) return <p>Upload a sample to begin.</p>;
  const fractions = profile?.elemental.carbon_fractions ?? {};
  const calculated = profile?.elemental.calculated;
  const rows = calculated
    ? [{ name: "Calculated carbon", value: calculated.elements_wt_pct.carbon_pct }]
    : [];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Carbon</p>
        <h1 className="font-serif text-4xl font-medium">Carbon Intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Biogenic, fossil, and inert fractions are shown only when those columns are in the sample. This screen does not perform spectroscopy.
        </p>
      </header>
      <section className="border border-line bg-surface p-4">
        <h2 className="mb-3 font-serif text-2xl">Carbon impact availability</h2>
        <CarbonAvailability sample={active} profile={profile} />
      </section>
      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Carbon fractions</h2>
        {Object.keys(fractions).length ? (
          <ul className="mt-3 text-sm">
            {Object.values(fractions).map((item) => (
              <li key={item.label}>
                {item.label}: {showNumber(item.value, 2, "%")} <span className="text-muted">({item.kind})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">Carbon fraction unavailable for this sample.</p>
        )}
      </section>
      <section className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Stoichiometric carbon</h2>
        {rows.length && calculated ? (
          <>
            <HorizontalBars rows={rows} unit=" wt%" label="Calculated carbon from identified polymers" />
            <p className="text-sm">
              Calculated value. Identified mass {showNumber(calculated.identified_mass_pct, 1, "%")}. Uncharacterized mass{" "}
              {showNumber(calculated.uncharacterized_mass_pct, 1, "%")}.
            </p>
            <p className="mt-2 text-sm text-muted">{calculated.note}</p>
          </>
        ) : (
          <p className="mt-3 text-sm">Profile is loading.</p>
        )}
      </section>
      <section className="border border-line bg-surface p-4 text-sm">
        <h2 className="font-serif text-2xl">Pathway carbon comparison</h2>
        <p className="mt-3">Insufficient data. No emission factors are included, so pathway carbon impacts are not calculated.</p>
      </section>
    </div>
  );
}
