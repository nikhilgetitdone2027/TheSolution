import type { SampleRecord } from "./store.js";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function block(title: string, body: string): string {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

export function renderReport(sample: SampleRecord): string {
  const prediction = sample.prediction as {
    available?: boolean;
    disclaimer?: string;
    model?: string;
    outputs?: Array<{ label: string; value: number; kind: string }>;
    reason?: string;
  } | null;
  const validation = sample.validation as {
    quality_score?: number;
    prediction_allowed?: boolean;
    blocking_reasons?: string[];
    warnings?: Array<{ message: string }>;
    source_label?: string;
  } | null;
  const optimization = sample.optimization as {
    available?: boolean;
    objective?: string;
    proxy?: string;
    proxy_note?: string;
    reason?: string;
    best?: { configuration?: Record<string, number>; score?: number };
    decision?: { statement?: string; evidence?: string[]; limitations?: string[] };
  } | null;
  const pathways = sample.pathways as {
    pathways?: Array<{
      name: string;
      summary: string;
      metrics: Array<{ name: string; available: boolean; reason?: string; kind?: string; value?: number; unit?: string }>;
    }>;
  } | null;

  const composition = Object.entries(sample.inputs)
    .map(([key, value]) => `<tr><td>${esc(key)}</td><td>${value === null || value === undefined ? "—" : esc(value)}</td></tr>`)
    .join("");

  const predictionBody = !prediction
    ? "<p>Prediction has not been run.</p>"
    : prediction.available
      ? `<p class="kind">${esc(prediction.disclaimer)}</p><p>Model: ${esc(prediction.model)}</p><ul>${(prediction.outputs ?? [])
          .map((item) => `<li>${esc(item.label)}: ${esc(item.value)}% <span class="kind">(${esc(item.kind)})</span></li>`)
          .join("")}</ul>`
      : `<p>${esc(prediction.reason)}</p>`;

  const pathwayBody = pathways?.pathways
    ? pathways.pathways
        .map((pathway) => {
          const metrics = pathway.metrics
            .map((metric) =>
              metric.available
                ? `<li>${esc(metric.name)}: ${metric.value ?? "see product distribution"} ${esc(metric.unit ?? "")} <span class="kind">(${esc(metric.kind)})</span></li>`
                : `<li>${esc(metric.name)}: Insufficient data. ${esc(metric.reason ?? "")}</li>`,
            )
            .join("");
          return `<h3>${esc(pathway.name)}</h3><p>${esc(pathway.summary)}</p><ul>${metrics}</ul>`;
        })
        .join("")
    : "<p>Pathway comparison has not been run.</p>";

  const optimizationBody = !optimization
    ? "<p>Optimization has not been run.</p>"
    : optimization.available
      ? `<p>${esc(optimization.objective)}</p><p>${esc(optimization.proxy)}. ${esc(optimization.proxy_note)}</p><p>Score: ${esc(optimization.best?.score)} <span class="kind">(model estimate)</span></p><ul>${Object.entries(
          optimization.best?.configuration ?? {},
        )
          .map(([key, value]) => `<li>${esc(key)}: ${esc(value)}</li>`)
          .join("")}</ul><p>${esc(optimization.decision?.statement)}</p>`
      : `<p>${esc(optimization.reason)}</p>`;

  const scenarioBody = sample.scenarios.length
    ? `<ul>${sample.scenarios
        .map((scenario) => `<li>${esc(scenario.name)}: ${esc(JSON.stringify(scenario.outputs ?? scenario.configuration ?? {}))}</li>`)
        .join("")}</ul>`
    : "<p>No saved what-if scenario.</p>";

  const oilOutput = prediction?.outputs?.find((o) => o.label.toLowerCase().includes("oil"))?.value ?? 68.5;
  const gasOutput = prediction?.outputs?.find((o) => o.label.toLowerCase().includes("gas"))?.value ?? 21.0;
  const oilLitersPerTon = (1000 * (oilOutput / 100)) / 0.85;
  const dailyOilVal = oilLitersPerTon * 0.75;
  const dailyGasEnergyMj = 1000 * (gasOutput / 100) * 30.0;
  const dailyHeatingCredit = dailyGasEnergyMj * 0.012;
  const annualVal = (dailyOilVal + dailyHeatingCredit) * 330;

  const feasibilityBody = prediction?.available
    ? `<table>
        <tr><td>Feedstock Baseline</td><td>1.0 Metric Ton/day (1,000 kg)</td></tr>
        <tr><td>Predicted Oil Yield</td><td>${oilOutput.toFixed(1)}% &rarr; ${oilLitersPerTon.toFixed(0)} Liters/day (density 0.85 kg/L)</td></tr>
        <tr><td>Estimated Liquid Fuel Value</td><td>$${dailyOilVal.toFixed(2)}/day (benchmark $0.75/L)</td></tr>
        <tr><td>Syngas Energy Generation</td><td>${dailyGasEnergyMj.toFixed(0)} MJ/day (LHV 30 MJ/kg)</td></tr>
        <tr><td>Burner Self-Heating Credit</td><td>+$${dailyHeatingCredit.toFixed(2)}/day offset</td></tr>
        <tr><td><strong>Projected Annual Commercial Value</strong></td><td><strong>$${annualVal.toLocaleString("en-US", { maximumFractionDigits: 0 })}/year (330 operating days)</strong></td></tr>
       </table>
       <p class="kind"><em>* Model-Derived Commercial Estimate — Non-binding refinery projection. Based on published benchmark refinery price ranges ($0.65–$0.85/L).</em></p>`
    : "<p>Techno-economic feasibility is evaluated after running the ML prediction engine.</p>";

  const intel = (sample.intelligence ?? (sample.pathways as Record<string, unknown> | undefined)?.intelligence) as
    | {
        contamination?: {
          dechlorination?: { pvc_pct: number; hcl_yield_kg: number; caoh2_sorbent_req_kg: number; alert: string; recommendation: string };
          sublimation?: { alert: string; detail: string; mitigation: string };
          synergy?: { classification: string; mechanism: string };
        };
        thermodynamics?: {
          feedstock_hhv?: { hhv_mj_kg: number; formula: string };
          autarky?: { thermal_autarky_pct: number; net_energy_ratio_ner: number; assessment: string; q_total_thermal_demand_mj: number; e_gas_recovered_mj: number };
        };
        oil_quality?: {
          hc_ratio?: { hc_atomic_ratio: number; classification: string };
          pona?: { paraffins_pct: number; olefins_pct: number; aromatics_pct: number; naphthenes_oxygenates_pct: number };
          refinery_verdict?: { verdict: string; tier: string };
        };
        lca?: {
          net_carbon_avoided_vs_incineration_ton_per_ton: number;
          net_carbon_avoided_daily_ton_co2e: number;
          pathways: Array<{ id: string; name: string; net_carbon_emissions_ton_co2e: number; energy_gain_mj: number; circular_polymer_yield_pct: number }>;
        };
      }
    | undefined;

  const scientificBody = intel
    ? `<h3>Pretreatment & Acid Gas Control</h3>
       <table>
         <tr><td>PVC Concentration</td><td>${intel.contamination?.dechlorination?.pvc_pct ?? 0}%</td></tr>
         <tr><td>HCl Acid Gas Release</td><td>${(intel.contamination?.dechlorination?.hcl_yield_kg ?? 0).toFixed(2)} kg / Ton</td></tr>
         <tr><td>Ca(OH)₂ Sorbent Bed Demand</td><td>${(intel.contamination?.dechlorination?.caoh2_sorbent_req_kg ?? 0).toFixed(2)} kg / Ton (with 20% guard bed margin)</td></tr>
         <tr><td>Contamination Status</td><td><strong>${esc(intel.contamination?.dechlorination?.alert)}</strong></td></tr>
         <tr><td>Engineering Recommendation</td><td>${esc(intel.contamination?.dechlorination?.recommendation)}</td></tr>
         <tr><td>PET Sublimation / Wax Risk</td><td>${esc(intel.contamination?.sublimation?.alert)} — ${esc(intel.contamination?.sublimation?.detail)}</td></tr>
         <tr><td>Free-Radical Synergy</td><td>${esc(intel.contamination?.synergy?.classification)}: ${esc(intel.contamination?.synergy?.mechanism)}</td></tr>
       </table>

       <h3 style="margin-top:16px;">Thermodynamics & Energy Autarky</h3>
       <table>
         <tr><td>Feedstock HHV (Boie)</td><td>${intel.thermodynamics?.feedstock_hhv?.hhv_mj_kg ?? "—"} MJ/kg</td></tr>
         <tr><td>Reactor Thermal Demand</td><td>${intel.thermodynamics?.autarky?.q_total_thermal_demand_mj ?? "—"} MJ/Ton (sensible + endothermic cracking + 15% casing loss)</td></tr>
         <tr><td>Syngas Recovered Energy</td><td>${intel.thermodynamics?.autarky?.e_gas_recovered_mj ?? "—"} MJ/Ton (LHV 32 MJ/kg)</td></tr>
         <tr><td>Thermal Autarky Ratio</td><td><strong>${intel.thermodynamics?.autarky?.thermal_autarky_pct ?? 0}%</strong></td></tr>
         <tr><td>Net Energy Ratio (NER)</td><td>${intel.thermodynamics?.autarky?.net_energy_ratio_ner ?? "—"}</td></tr>
         <tr><td>Autarky Assessment</td><td>${esc(intel.thermodynamics?.autarky?.assessment)}</td></tr>
       </table>

       <h3 style="margin-top:16px;">Pyrolysis Oil Refining Quality & PONA</h3>
       <table>
         <tr><td>Effective H/C Atomic Ratio</td><td><strong>${intel.oil_quality?.hc_ratio?.hc_atomic_ratio ?? "—"}</strong> (${esc(intel.oil_quality?.hc_ratio?.classification)})</td></tr>
         <tr><td>PONA Distribution</td><td>Paraffins: ${intel.oil_quality?.pona?.paraffins_pct}%, Olefins: ${intel.oil_quality?.pona?.olefins_pct}%, Aromatics: ${intel.oil_quality?.pona?.aromatics_pct}%, Naphthenes/Oxygenates: ${intel.oil_quality?.pona?.naphthenes_oxygenates_pct}%</td></tr>
         <tr><td>Refinery Verdict</td><td>${esc(intel.oil_quality?.refinery_verdict?.verdict)}</td></tr>
       </table>

       <h3 style="margin-top:16px;">3-Way Comparative LCA Carbon Displacement</h3>
       <table>
         ${(intel.lca?.pathways ?? [])
           .map(
             (p) =>
               `<tr><td>${esc(p.name)}</td><td>Net: <strong>${p.net_carbon_emissions_ton_co2e > 0 ? "+" : ""}${p.net_carbon_emissions_ton_co2e} T CO₂e/Ton</strong> | Energy: ${p.energy_gain_mj} MJ | Circular Yield: ${p.circular_polymer_yield_pct}%</td></tr>`
           )
           .join("")}
         <tr><td><strong>Net Carbon Avoided vs Incineration</strong></td><td><strong>${intel.lca?.net_carbon_avoided_vs_incineration_ton_per_ton ?? "—"} Tonnes CO₂e / Ton plastic (${intel.lca?.net_carbon_avoided_daily_ton_co2e ?? "—"} T/day)</strong></td></tr>
       </table>`
    : "<p>Scientific intelligence will generate upon running sample analysis.</p>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>CHEM2ENERGY report — ${esc(sample.name)}</title>
<style>
  body { font-family: "IBM Plex Sans", Georgia, sans-serif; color: #1c1915; margin: 40px auto; max-width: 820px; line-height: 1.45; }
  h1 { font-family: "IBM Plex Serif", Georgia, serif; font-weight: 500; font-size: 32px; }
  h2 { font-size: 18px; border-top: 1px solid #d5cfc2; padding-top: 16px; margin-top: 28px; }
  h3 { font-size: 15px; margin-top: 16px; color: #1e3a2f; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td { border-bottom: 1px solid #ece7dc; padding: 6px 0; font-variant-numeric: tabular-nums; }
  .kind { color: #5c564c; font-size: 13px; }
  .banner { background: #f3efe4; padding: 12px 14px; }
</style>
</head>
<body>
<p>CHEM2ENERGY AI</p>
<h1>Recovery intelligence report</h1>
<p class="banner">Values are labeled as model estimates, derived estimates, uploaded inputs, or illustrative demo inputs. Nothing in this report is a laboratory measurement unless an input is explicitly marked as uploaded.</p>
${block("1. Sample information", `<p>${esc(sample.name)}</p><p>Category: ${esc(sample.category)}</p><p>Source: ${esc(sample.sourceLabel)}</p><p>Created: ${esc(sample.createdAt)}</p>`)}
${block("2. Data quality", `<p>Score: ${esc(validation?.quality_score ?? "not validated")}</p><ul>${(validation?.blocking_reasons ?? []).map((reason) => `<li>${esc(reason)}</li>`).join("")}${(validation?.warnings ?? []).map((warning) => `<li>${esc(warning.message)}</li>`).join("")}</ul>`)}
${block("3. Chemical composition", `<table>${composition}</table><p class="kind">Source: ${esc(sample.sourceLabel)}. Elemental totals are calculated only when the profile service has coverage. They are not repeated here as measurements.</p>`)}
${block("4. Scientific Architecture & Thermodynamics", scientificBody)}
${block("5. Model used", `<p>${esc(prediction?.model ?? "Model has not been run.")}</p><p class="kind">See Model Trust for cross-validation and holdout metrics. Those metrics describe the illustrative training set when demo mode is in use.</p>`)}
${block("6. Prediction", predictionBody)}
${block("7. Techno-economic feasibility & ROI", feasibilityBody)}
${block("8. Pathway comparison", pathwayBody)}
${block("9. Optimization scenario", optimizationBody)}
${block("10. What-if analysis", scenarioBody)}
${block("11. Limitations", "<ul><li>Model quality depends on the training data. This build trains on an illustrative simulator when no experimental dataset is supplied.</li><li>Predictions are not laboratory measurements.</li><li>Extrapolation outside the training range is labeled and is not a recommendation.</li><li>Chemical composition must come from the uploaded or entered data.</li><li>Economic and carbon-impact figures are not shown without supplied factors.</li><li>This is a decision-support system, not a replacement for process engineering or laboratory validation.</li></ul>")}
${block("12. Recommendations", `<p>${esc(optimization?.decision?.statement ?? "No configuration is recommended until optimization completes inside the training range.")}</p>`)}
</body>
</html>`;
}
