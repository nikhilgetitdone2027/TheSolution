import { useState } from "react";
import { CATEGORIES, MATERIAL_FIELDS, PROCESS_FIELDS } from "../format";
import { QualityMeter, SourceBadge } from "../components/Shell";
import { useAnalysis } from "../state/AnalysisContext";

const EMPTY_INPUTS = Object.fromEntries([...MATERIAL_FIELDS, ...PROCESS_FIELDS].map(([key]) => [key, ""]));

export function Samples() {
  const store = useAnalysis();
  const [category, setCategory] = useState("mixed_plastic");
  const [name, setName] = useState("Manual sample");
  const [inputs, setInputs] = useState<Record<string, string>>(EMPTY_INPUTS);
  const [notice, setNotice] = useState<string | null>(null);
  const validation = store.active?.validation;

  async function onFile(file: File) {
    const csvText = await file.text();
    const warnings = await store.uploadCsv(file.name, csvText, category);
    setNotice(warnings.length ? warnings.join(" ") : `${file.name} imported. Select a row and validate it.`);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Ingestion</p>
        <h1 className="font-serif text-4xl font-medium">Waste samples</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Composition must come from a table, a file, or values you enter. A photograph is not accepted as an elemental analysis.
        </p>
      </header>

      <label className="block max-w-sm text-sm">
        Waste category
        <select className="mt-1 w-full border border-line bg-surface px-3 py-2" value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {category !== "mixed_plastic" ? (
        <p className="max-w-2xl text-sm">
          This category can be stored. Prediction stays unavailable because the implemented model covers mixed-plastic pyrolysis only.
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <form
          className="border border-dashed border-line bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const file = (event.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
            if (file) void onFile(file);
          }}
        >
          <h2 className="font-serif text-xl">CSV or JSON text</h2>
          <p className="mt-2 text-sm text-muted">CSV is parsed on the server. A one-row JSON object can be saved as a manual sample.</p>
          <input className="mt-3 block w-full text-sm" name="file" type="file" accept=".csv,text/csv" />
          <button className="mt-3 border border-line px-3 py-2 text-sm" type="submit">
            Upload CSV
          </button>
          <a className="mt-3 block text-sm text-pine underline" href="/api/template.csv">
            Download column template
          </a>
        </form>

        <div className="border border-line bg-surface p-4">
          <h2 className="font-serif text-xl">Demo dataset</h2>
          <p className="mt-2 text-sm text-muted">Hackathon Demo Dataset — Illustrative. Outputs are predicted, not stored as measurements.</p>
          <div className="mt-3 flex flex-col gap-2">
            {[
              ["A", "Mixed plastic"],
              ["B", "High PE/PP"],
              ["C", "Higher PET/PVC"],
              ["D", "Identified polymers only"],
            ].map(([id, label]) => (
              <button key={id} className="border border-line px-3 py-2 text-left text-sm" type="button" onClick={() => store.loadDemo(id)}>
                Load sample {id} · {label}
              </button>
            ))}
          </div>
        </div>

        <form
          className="border border-line bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const numeric = Object.fromEntries(
              Object.entries(inputs).map(([key, value]) => [key, value === "" ? null : Number(value)]),
            );
            void store.createManual(name, category, numeric);
          }}
        >
          <h2 className="font-serif text-xl">Manual entry</h2>
          <input className="mt-3 w-full border border-line px-2 py-1 text-sm" value={name} onChange={(event) => setName(event.target.value)} aria-label="Sample name" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.keys(EMPTY_INPUTS).map((key) => (
              <label key={key} className="text-xs text-muted">
                {key}
                <input
                  className="mt-1 w-full border border-line px-2 py-1 text-sm text-ink"
                  inputMode="decimal"
                  value={inputs[key]}
                  onChange={(event) => setInputs((current) => ({ ...current, [key]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          <button className="mt-3 bg-pine px-3 py-2 text-sm text-white" type="submit">
            Save sample
          </button>
          <label className="mt-4 block text-xs text-muted">
            Or paste one JSON object
            <textarea
              className="mt-1 w-full border border-line p-2 font-mono text-xs text-ink"
              rows={4}
              placeholder='{"name":"JSON sample","pe_pct":40,"pp_pct":30,"pet_pct":10,"ps_pct":10,"pvc_pct":5,"other_pct":5,"moisture_pct":1,"particle_size_mm":3,"feed_rate_kg_h":12,"temperature_c":460,"residence_time_min":40}'
              onBlur={(event) => {
                const text = event.target.value.trim();
                if (!text) return;
                try {
                  const parsed = JSON.parse(text) as Record<string, unknown>;
                  const sampleName = typeof parsed.name === "string" ? parsed.name : "JSON sample";
                  const numeric: Record<string, number | null> = {};
                  for (const [key, value] of Object.entries(parsed)) {
                    if (key === "name") continue;
                    numeric[key] = typeof value === "number" ? value : null;
                  }
                  void store.createManual(sampleName, category, numeric);
                  event.target.value = "";
                } catch {
                  setNotice("That JSON could not be read. Use one object with numeric fields.");
                }
              }}
            />
          </label>
        </form>
      </section>

      {notice ? <p className="text-sm">{notice}</p> : null}

      <section className="border border-line bg-surface">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-serif text-xl">Loaded samples</h2>
          {store.active ? (
            <button className="bg-pine px-3 py-2 text-sm text-white disabled:opacity-50" type="button" disabled={store.busy === "validate"} onClick={() => store.validateActive()}>
              {store.busy === "validate" ? "Validating…" : "Validate"}
            </button>
          ) : null}
        </header>
        {store.samples.length === 0 ? <p className="p-4 text-sm">Upload a sample to begin.</p> : null}
        <ul>
          {store.samples.map((sample) => (
            <li key={sample.id} className="border-t border-line">
              <button className="flex w-full items-center justify-between px-4 py-3 text-left" type="button" onClick={() => store.select(sample.id)}>
                <span>
                  <span className="block font-medium">{sample.name}</span>
                  <span className="text-sm text-muted">{sample.sourceLabel}</span>
                </span>
                <span className="text-sm">{store.active?.id === sample.id ? "Current" : "Select"}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {store.active ? <SourceBadge label={store.active.sourceLabel} /> : null}
      {validation ? (
        <section className="max-w-xl space-y-3 border border-line bg-surface p-4">
          <QualityMeter score={validation.quality_score} />
          <ul className="text-sm">
            <li>Detected: {validation.detected.required_present} of {validation.detected.required_total} required variables</li>
            <li>{validation.detected.invalid_values} invalid values</li>
            <li>{validation.detected.optional_missing.length} optional variables missing</li>
          </ul>
          {validation.errors.map((item) => (
            <p key={item.message} className="text-sm text-bad">
              {item.message}
            </p>
          ))}
          {validation.warnings.map((item) => (
            <p key={item.message} className="text-sm text-warn">
              {item.message}
            </p>
          ))}
          {validation.prediction_allowed ? (
            <button className="bg-ink px-3 py-2 text-sm text-white" type="button" onClick={() => store.analyze()}>
              Run AI analysis
            </button>
          ) : (
            <p className="text-sm">{validation.blocking_reasons.join(" ")}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
