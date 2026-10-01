import type { Profile, Sample } from "../../types";
import { useStagger } from "./motion";

export function CarbonAvailability({ sample, profile }: { sample: Sample; profile: Profile | null }) {
  const uploaded = profile?.elemental.uploaded_elements ?? {};
  const fractions = profile?.elemental.carbon_fractions ?? {};
  const metrics = sample.pathways?.pathways.flatMap((pathway) => pathway.metrics) ?? [];
  const carbonMetric = metrics.find((metric) => metric.name === "Carbon impact");
  const checks = [
    {
      label: "Whole-sample carbon data",
      ok: "carbon_pct" in uploaded,
      detail: "carbon_pct" in uploaded ? "Uploaded carbon value present" : "Only identified polymers have a calculated carbon share. The Other fraction has none.",
    },
    {
      label: "Validated emission factor",
      ok: Boolean(carbonMetric?.available),
      detail: carbonMetric?.available ? "Emission factor supplied" : (carbonMetric?.reason ?? "No emission factors ship with this build."),
    },
    {
      label: "Fossil / biogenic carbon fraction",
      ok: Object.keys(fractions).length > 0,
      detail: Object.keys(fractions).length ? "Uploaded fractions present" : (profile?.elemental.carbon_fraction_status ?? "Not in the sample."),
    },
  ];
  const shown = useStagger(checks.length + 1, 450, Boolean(profile));
  const sufficient = checks.every((check) => check.ok);
  if (!profile) return <p className="text-sm text-muted">Reading the chemical profile…</p>;
  return (
    <figure>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Carbon analysis · data available?</p>
      <ul className="mt-3 space-y-2" aria-live="polite">
        {checks.map((check, index) => (
          <li key={check.label} className={`check ${index < shown ? (check.ok ? "is-pass" : "is-fail") : "is-pending"}`}>
            <span className="check-glyph" aria-hidden>
              {index < shown ? (check.ok ? "✓" : "✕") : "○"}
            </span>
            <span>
              <span className="block text-sm">
                {check.label} <span className="sr-only">{check.ok ? "available" : "missing"}</span>
              </span>
              {index < shown ? <span className="block text-xs text-muted">{check.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {shown > checks.length ? (
        <p className={`mt-4 inline-block border px-3 py-2 text-sm font-medium tracking-[0.14em] fade-up ${sufficient ? "border-pine text-pine" : "border-warn text-warn"}`}>
          {sufficient ? "DATA AVAILABLE" : "INSUFFICIENT DATA"}
        </p>
      ) : null}
      <figcaption className="mt-2 text-xs text-muted">No carbon impact number is shown unless every input above exists.</figcaption>
    </figure>
  );
}
