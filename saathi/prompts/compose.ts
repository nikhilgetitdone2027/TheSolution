import type { Evidence, Language, OutputFact, RangeFact } from "../schemas/types.js";
import type { Intent } from "../actions/intent.js";
import { pageSense } from "../context/page.js";

const MISSING: Record<Language, string> = {
  en: "I don't have enough data to answer that from the current sample.",
  hi: "इस sample से मेरे पास इस सवाल का जवाब देने के लिए पर्याप्त data नहीं है।",
  hinglish: "Is sample se mere paas itna data nahi hai ki main yeh jawab de sakun.",
};

const INPUT_LABELS: Record<string, string> = {
  pe_pct: "PE",
  pp_pct: "PP",
  pet_pct: "PET",
  ps_pct: "PS",
  pvc_pct: "PVC",
  other_pct: "Other",
  moisture_pct: "moisture",
  particle_size_mm: "particle size",
  feed_rate_kg_h: "feed rate",
  temperature_c: "temperature",
  residence_time_min: "residence time",
};

function n(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function output(outputs: OutputFact[] | undefined, key: string): number | null {
  return outputs?.find((item) => item.key === key)?.value ?? null;
}

function products(outputs: OutputFact[] | undefined, language: Language): string | null {
  const oil = output(outputs, "oil_pct");
  const gas = output(outputs, "gas_pct");
  const char = output(outputs, "char_pct");
  const other = output(outputs, "other_product_pct");
  if (oil === null || gas === null || char === null || other === null) return null;
  if (language === "hi") {
    return `oil ${n(oil, 2)}%, gas ${n(gas, 2)}%, char ${n(char, 2)}%, और other products ${n(other, 2)}%`;
  }
  if (language === "hinglish") {
    return `oil ${n(oil, 2)}%, gas ${n(gas, 2)}%, char ${n(char, 2)}%, aur other products ${n(other, 2)}%`;
  }
  return `oil ${n(oil, 2)}%, gas ${n(gas, 2)}%, char ${n(char, 2)}%, and other products ${n(other, 2)}%`;
}

function topImportance(evidence: Evidence): string[] {
  const rows = evidence.sample?.importance.length ? evidence.sample.importance : evidence.model?.importance ?? [];
  return rows.slice(0, 3).map((row) => row.label);
}

function range(evidence: Evidence, key: string): RangeFact | null {
  return evidence.model?.ranges.find((item) => item.key === key) ?? null;
}

function predictionKind(evidence: Evidence, language: Language): string {
  const illustrative = evidence.sample?.prediction?.illustrative || /illustrative/i.test(evidence.sample?.sourceLabel ?? "");
  if (language === "hi") {
    return illustrative
      ? "यह model prediction है, laboratory measurement नहीं। Training data illustrative dataset है।"
      : "यह model prediction है, laboratory measurement नहीं।";
  }
  if (language === "hinglish") {
    return illustrative
      ? "Yeh model prediction hai, laboratory measurement nahi. Training data illustrative dataset hai."
      : "Yeh model prediction hai, laboratory measurement nahi.";
  }
  return illustrative
    ? "This is a model prediction, not a laboratory measurement. The training table is an illustrative dataset."
    : "This is a model prediction, not a laboratory measurement.";
}

function joinList(items: string[], language: Language): string {
  if (items.length === 1) return items[0] ?? "";
  if (language === "hi") return `${items.slice(0, -1).join(", ")} और ${items[items.length - 1]}`;
  if (language === "hinglish") return `${items.slice(0, -1).join(", ")} aur ${items[items.length - 1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function compose(language: Language, intent: Intent, evidence: Evidence, simple: boolean): string {
  const sample = evidence.sample;
  const model = evidence.model;
  if (intent === "greet") {
    if (language === "hi") {
      return "नमस्ते। मैं Saathi हूँ। मैं CHEM2ENERGY में waste composition से recovery decision तक की प्रक्रिया समझा सकता हूँ।";
    }
    if (language === "hinglish") {
      return "Namaste. Main Saathi hoon. Main aapko CHEM2ENERGY ke through waste composition se recovery decisions tak ka complete process samjha sakta hoon.";
    }
    return "Hello. I'm Saathi. I can walk you from the waste composition through the model prediction to the recovery decision.";
  }

  if (!sample && intent !== "model" && intent !== "limitations" && intent !== "unknown") {
    return MISSING[language];
  }

  if (intent === "analyze") {
    if (!sample) return MISSING[language];
    if (sample.predictionAllowed === false) {
      const reason = sample.blocking[0];
      if (language === "hi") return reason ? `Analysis शुरू नहीं हो सकता। ${reason}` : "Analysis शुरू नहीं हो सकता। Validation ने prediction रोक दी है।";
      if (language === "hinglish") return reason ? `Analysis shuru nahi ho sakta. ${reason}` : "Analysis shuru nahi ho sakta. Validation ne prediction rok di hai.";
      return reason ? `I can't start the analysis. ${reason}` : "I can't start the analysis. Validation blocked the prediction.";
    }
    if (language === "hi") return "मैं analysis शुरू करता हूँ। Prediction आने के बाद मैं बताऊँगा कि model क्या दिखा रहा है।";
    if (language === "hinglish") return "Main analysis shuru karta hoon. Prediction aane ke baad main bataunga ki model kya dikha raha hai.";
    return "I'll start the analysis. When the prediction is back, I will explain what the model is showing.";
  }

  if (intent === "unknown") {
    if (evidence.docs[0]) {
      return evidence.docs[0];
    }
    return language === "en" ? "I don't have enough information to determine that." : MISSING[language];
  }

  if (intent === "limitations" || (intent === "model" && !model && !sample)) {
    const line = evidence.docs[0];
    if (!line && !model) return MISSING[language];
  }

  switch (intent) {
    case "summarize":
    case "prediction":
      return predictionAnswer(language, evidence, simple, intent === "summarize");
    case "pyrolysis":
      return pyrolysisAnswer(language, evidence, simple);
    case "temperature":
    case "parameter":
      return temperatureAnswer(language, evidence, simple);
    case "compare":
      return compareAnswer(language, evidence);
    case "importance":
    case "oil":
      return importanceAnswer(language, evidence, simple, intent === "oil");
    case "composition":
    case "pvc":
      return compositionAnswer(language, evidence, intent === "pvc");
    case "quality":
      return qualityAnswer(language, evidence);
    case "model":
      return modelAnswer(language, evidence, simple);
    case "objective":
    case "assumptions":
    case "alternatives":
      return optimizationAnswer(language, evidence, intent);
    case "carbon":
      return carbonAnswer(language, evidence);
    case "impact":
      return impactAnswer(language, evidence);
    case "measured":
      return measuredAnswer(language, evidence);
    case "limitations":
      return limitationsAnswer(language, evidence);
    default:
      return MISSING[language];
  }
}

function predictionAnswer(language: Language, evidence: Evidence, simple: boolean, afterRun: boolean): string {
  const sentence = products(evidence.sample?.prediction?.outputs, language);
  if (!evidence.sample?.prediction?.available || !sentence) {
    if (language === "hi") return "इस sample पर अभी prediction उपलब्ध नहीं है। Analysis चलने के बाद मैं product distribution बता सकता हूँ।";
    if (language === "hinglish") return "Is sample par abhi prediction available nahi hai. Analysis ke baad main product distribution bata sakta hoon.";
    return "This sample does not have a prediction yet. I can explain the product distribution after the analysis runs.";
  }
  const kind = predictionKind(evidence, language);
  const names = topImportance(evidence);
  const factors = names.length ? joinList(names, language) : "";
  if (language === "hi") {
    const influence = factors ? ` Prediction में ${factors} सबसे influential inputs हैं।` : "";
    return afterRun
      ? `${kind} अभी model ने product distribution predict की है: ${sentence}.${influence} ${pageSense(evidence.page)}`
      : `${kind} ${evidence.sample.name} के लिए model ${sentence} दिखा रहा है।${influence}`;
  }
  if (language === "hinglish") {
    const influence = factors
      ? ` Prediction mein ${factors} sabse influential inputs rahe.`
      : "";
    return afterRun
      ? `Abhi model ne product distribution predict kiya hai. ${sentence}. Yeh model prediction hai, laboratory measurement nahi.${influence} Aap chahein toh main in factors ko aur detail mein samjha sakta hoon.`
      : `${kind} ${evidence.sample.name} ke liye model ${sentence} dikha raha hai.${simple ? "" : influence}`;
  }
  const influence = factors ? ` The strongest recorded contributors are ${factors}.` : "";
  return `${kind} For ${evidence.sample.name}, the model is showing ${sentence}.${simple ? "" : influence}`;
}

function pyrolysisAnswer(language: Language, evidence: Evidence, simple: boolean): string {
  const pathway = evidence.sample?.pathways.find((item) => item.id === "pyrolysis");
  const names = topImportance(evidence);
  const statement = evidence.sample?.decisionStatement;
  if (!pathway && !statement && !names.length) return MISSING[language];
  if (language === "hi") {
    return `Pyrolysis यहाँ evaluate हो रहा है क्योंकि current sample में वे material fractions हैं जिन पर यह model train हुआ है। ${statement ? `${statement} ` : ""}यह model-based evaluation है, इस बात की guarantee नहीं कि industrial pyrolysis सही real-world treatment है।${simple || !names.length ? "" : ` Model के recorded contributors में ${joinList(names, language)} शामिल हैं।`}`;
  }
  if (language === "hinglish") {
    return `Pyrolysis isliye consider ho raha hai kyunki is sample mein woh material fractions hain jin par model train hua hai. ${statement ? `${statement} ` : ""}Yeh model-based evaluation hai. Yeh guarantee nahi hai ki industrial pyrolysis sahi real-world treatment hai.${simple || !names.length ? "" : ` Recorded contributors mein ${joinList(names, language)} hain.`}`;
  }
  return `Pyrolysis is being evaluated here because the current sample contains the material characteristics this model was trained on. ${statement ? `${statement} ` : ""}This is a model-based evaluation, not a guarantee that industrial pyrolysis is the appropriate real-world treatment.${simple || !names.length ? "" : ` The strongest recorded contributors are ${joinList(names, language)}.`}`;
}

function temperatureAnswer(language: Language, evidence: Evidence, simple: boolean): string {
  const band = range(evidence, "temperature_c");
  const ready = Boolean(evidence.sample?.optimization?.available);
  const change = evidence.simulation?.changes.find((item) => item.key === "temperature_c");
  if (change && evidence.simulation) {
    const before = evidence.simulation.before.oil_pct;
    const after = evidence.simulation.after.oil_pct;
    const oil = before !== undefined && after !== undefined ? ` Oil moved from ${n(before)}% to ${n(after)}%.` : "";
    if (language === "hi") {
      return `Temperature ${n(change.from)} से ${n(change.to)} ${change.unit} हुआ। Model prediction update हुआ है।${oil} यह model estimate है, measurement नहीं।`;
    }
    if (language === "hinglish") {
      return `Temperature ${n(change.from)} se ${n(change.to)} ${change.unit} ho gayi. Model prediction update hua hai.${oil} Yeh model estimate hai, measurement nahi. Main before aur after comparison use kar raha hoon.`;
    }
    return `Temperature changed from ${n(change.from)} to ${n(change.to)} ${change.unit}. The model prediction has been updated.${oil} This is a model estimate, not a measurement.`;
  }
  if (!band) return MISSING[language];
  const span = `${n(band.min)}–${n(band.max)} ${band.unit}`;
  if (language === "hi") {
    return ready
      ? `What-If Lab खुल रहा है। Temperature training range ${span} के अंदर रहती है। मैंने कोई scientific input change नहीं किया।${simple ? "" : " Slider training range के बाहर नहीं जाता।"}`
      : `Temperature की training range ${span} है। What-If Lab optimization के बाद खुलता है, ताकि slider training range के bahar na jaaye। मैंने inputs change नहीं किए।`;
  }
  if (language === "hinglish") {
    return ready
      ? `What-If Lab khol raha hoon. Temperature ki training range ${span} hai. Agar temperature change karoge, predicted output usi model se update hoga. Maine koi input change nahi kiya.`
      : `Temperature ki training range ${span} hai. What-If Lab optimization ke baad khulta hai, kyunki slider training range ke bahar nahi jaata. Maine inputs change nahi kiye.`;
  }
  return ready
    ? `I am opening the What-If Lab. Temperature stays inside the training range, ${span}. I have not changed any inputs. After you move the slider, the same model updates the prediction.`
    : `The training range for temperature is ${span}. The What-If Lab opens after optimization, so every slider stays inside that range. I have not changed any inputs.`;
}

function compareAnswer(language: Language, evidence: Evidence): string {
  const simulation = evidence.simulation;
  if (!simulation) {
    if (language === "hi") return "अभी before और after comparison उपलब्ध नहीं है। What-If Lab में parameter change के बाद मैं दोनों predictions compare कर सकता हूँ।";
    if (language === "hinglish") return "Abhi before aur after comparison available nahi hai. What-If Lab mein parameter change ke baad main dono predictions compare kar sakta hoon.";
    return "A before-and-after comparison is not available yet. After a parameter change in the What-If Lab, I can compare the two model predictions.";
  }
  const pairs = ["oil_pct", "gas_pct", "char_pct", "other_product_pct"]
    .map((key) => {
      const before = simulation.before[key];
      const after = simulation.after[key];
      if (before === undefined || after === undefined) return null;
      const label = key.replace("_pct", "").replace("other_product", "other products");
      return `${label} ${n(before, 2)}% → ${n(after, 2)}%`;
    })
    .filter((item): item is string => item !== null);
  if (!pairs.length) return MISSING[language];
  const moved = simulation.changes.map((item) => `${item.label} ${n(item.from)} → ${n(item.to)} ${item.unit}`).join("; ");
  if (language === "hi") {
    return `यह before और after model prediction है, measurement नहीं। ${moved ? `Badla hua input: ${moved}. ` : ""}Products: ${pairs.join(", ")}.`;
  }
  if (language === "hinglish") {
    return `Yeh before aur after model prediction hai, measurement nahi. ${moved ? `Changed input: ${moved}. ` : ""}Products: ${pairs.join(", ")}.`;
  }
  return `These are before-and-after model predictions, not measurements. ${moved ? `Changed input: ${moved}. ` : ""}Products: ${pairs.join(", ")}.`;
}

function importanceAnswer(language: Language, evidence: Evidence, simple: boolean, oil: boolean): string {
  const rows = (evidence.sample?.importance.length ? evidence.sample.importance : evidence.model?.importance ?? []).slice(0, 3);
  if (!rows.length) return MISSING[language];
  const method = evidence.model?.importanceMethod ?? "permutation importance";
  const names = joinList(rows.map((row) => row.label), language);
  const technical = rows.map((row) => `${row.label} +${row.meanMaeIncrease.toFixed(3)} MAE`).join(", ");
  const oilLine = oilEffect(evidence);
  if (language === "hi") {
    return simple
      ? `Model mainly ${names} par respond kar raha hai. Yeh strongest recorded contributors hain. Method ${method} hai. SHAP is build mein available nahi hai.`
      : `Model mainly ${names} par respond kar raha hai. Holdout par permutation se MAE increase: ${technical}. Yeh SHAP values nahi hain. ${oilLine ?? ""}`.trim();
  }
  if (language === "hinglish") {
    return `Model ke according ${names} prediction ke major contributing factors hain. Method ${method} hai, SHAP nahi. ${simple ? "" : technical + ". "}${oilLine ?? "Yeh poore model ki importance hai, sirf oil ka alag attribution nahi."}`.trim();
  }
  return simple
    ? `The model is mainly responding to ${names}. These are the strongest recorded contributors. The method is ${method}. SHAP is not available in this build.`
    : `The model is mainly responding to ${names}. Permutation importance on the holdout set, as mean MAE increase: ${technical}. These are not SHAP values. ${oil ? oilLine ?? "This is overall model importance, not a separate oil-only attribution." : ""}`.trim();
}

function oilEffect(evidence: Evidence): string | null {
  const effects = evidence.sample?.localEffects.filter((item) => item.oilDelta !== null) ?? [];
  if (!effects.length) return null;
  const strongest = [...effects].sort((a, b) => Math.abs(b.oilDelta ?? 0) - Math.abs(a.oilDelta ?? 0))[0];
  if (!strongest || strongest.oilDelta === null) return null;
  return `A local step on ${strongest.label} changed predicted oil by ${strongest.oilDelta.toFixed(2)} percentage points. That step is a model sensitivity, not a lab trial.`;
}

function compositionAnswer(language: Language, evidence: Evidence, pvc: boolean): string {
  const sample = evidence.sample;
  if (!sample) return MISSING[language];
  const pvcValue = sample.inputs.pvc_pct;
  if (pvc) {
    if (pvcValue === null || pvcValue === undefined) return MISSING[language];
    if (language === "hi") {
      return `PVC यहाँ uploaded composition का polyvinyl chloride fraction है। इस sample पर यह ${n(pvcValue)}% है। यह entered value है। मैंने waste को chemically analyze नहीं किया।`;
    }
    if (language === "hinglish") {
      return `PVC yahan uploaded composition ka polyvinyl chloride fraction hai. Is sample par yeh ${n(pvcValue)}% hai. Yeh entered value hai. Maine waste ko chemically analyze nahi kiya.`;
    }
    return `PVC here is the polyvinyl chloride fraction in the uploaded composition. On this sample it is ${n(pvcValue)}%. That value was entered with the sample. I did not chemically analyze the waste.`;
  }
  const parts = Object.entries(INPUT_LABELS)
    .filter(([key]) => key.endsWith("_pct") && sample.inputs[key] !== null && sample.inputs[key] !== undefined)
    .map(([key, label]) => `${label} ${n(sample.inputs[key] as number)}%`);
  if (!parts.length && !sample.elements) return MISSING[language];
  const elemental = sample.elements
    ? Object.entries(sample.elements)
        .map(([key, value]) => `${key} ${n(value)}%`)
        .join(", ")
    : "";
  if (language === "hi") {
    return `Uploaded material composition: ${parts.join(", ")}. ${elemental ? `PE, PP, PET, PS, aur PVC se calculate hue elements: ${elemental}. ` : ""}${sample.elementalNote ?? "Other fraction ka koi assumed formula nahi hai."} Yeh stoichiometric calculation hai, lab measurement nahi.`;
  }
  if (language === "hinglish") {
    return `Uploaded material composition: ${parts.join(", ")}. ${elemental ? `PE, PP, PET, PS aur PVC se calculated elements: ${elemental}. ` : ""}${sample.elementalNote ?? "Other fraction ka koi assumed formula nahi hai."} Yeh stoichiometric calculation hai, laboratory measurement nahi.`;
  }
  return `The uploaded chemical profile indicates ${parts.join(", ")}. ${elemental ? `Elements calculated from PE, PP, PET, PS, and PVC repeat units: ${elemental}. ` : ""}${sample.elementalNote ?? "The Other fraction has no assumed formula."} This is a stoichiometric calculation, not a laboratory measurement.`;
}

function qualityAnswer(language: Language, evidence: Evidence): string {
  const sample = evidence.sample;
  if (!sample || sample.qualityScore === null) return MISSING[language];
  const missing = sample.optionalMissing.length ? sample.optionalMissing.join(", ") : "";
  if (language === "hi") {
    return `Data quality score ${n(sample.qualityScore, 0)} है। ${missing ? `Optional columns missing hain: ${missing}. ` : ""}Prediction ke required features alag se check hote hain. ${sample.predictionAllowed === false ? "Prediction abhi allowed nahi hai." : "Required features prediction ke liye present hain."}`;
  }
  if (language === "hinglish") {
    return `Data quality score ${n(sample.qualityScore, 0)} hai. ${missing ? `Optional columns missing hain: ${missing}. ` : ""}Prediction ke required features alag check hote hain. ${sample.predictionAllowed === false ? "Prediction abhi allowed nahi hai." : "Required features prediction ke liye present hain."}`;
  }
  return `The data quality score is ${n(sample.qualityScore, 0)}. ${missing ? `Optional columns still missing: ${missing}. ` : ""}Prediction uses the required model features separately. ${sample.predictionAllowed === false ? "Prediction is not allowed yet." : "The required features for a prediction are present."}`;
}

function modelAnswer(language: Language, evidence: Evidence, simple: boolean): string {
  const model = evidence.model;
  if (!model?.name || !model.holdout) return MISSING[language];
  const holdout = `MAE ${n(model.holdout.mae, 3)}, RMSE ${n(model.holdout.rmse, 3)}, R² ${n(model.holdout.r2, 3)}`;
  const spread = model.supportsSpread
    ? ""
    : language === "en"
      ? " A confidence interval from model disagreement is not available, because this is a single model rather than an ensemble."
      : language === "hi"
        ? " Model disagreement se confidence interval available nahi hai, kyunki yeh ek single model hai."
        : " Model disagreement wala confidence interval available nahi hai, kyunki yeh single model hai.";
  if (language === "hi") {
    return simple
      ? `Selected model ${model.name} hai. Holdout metrics simulator recovery ke hain, laboratory accuracy nahi: ${holdout}.${spread}`
      : `Selected model ${model.name} hai. ${model.reason ?? ""} Holdout metrics, jo illustrative dataset par fit ko maapte hain: ${holdout}.${spread} ${model.datasetLabel ?? ""}`.trim();
  }
  if (language === "hinglish") {
    return `Selected model ${model.name} hai. Holdout metrics illustrative dataset par fit dikhate hain, laboratory accuracy nahi: ${holdout}.${spread}`;
  }
  return `The selected model is ${model.name}. ${simple ? "" : `${model.reason ?? ""} `}Holdout metrics describe fit to the illustrative dataset, not laboratory accuracy: ${holdout}.${spread}`.replace(/\s+/g, " ").trim();
}

function optimizationAnswer(language: Language, evidence: Evidence, intent: Intent): string {
  const optimization = evidence.sample?.optimization;
  if (!optimization) return MISSING[language];
  if (!optimization.available) {
    const reason = optimization.reason ?? MISSING[language];
    if (language === "en") return `This objective is not available from the current data. ${reason}`;
    if (language === "hi") return `Yeh objective current data se available nahi hai. ${reason}`;
    return `Yeh objective current data se available nahi hai. ${reason}`;
  }
  const config = Object.entries(optimization.configuration)
    .map(([key, value]) => `${INPUT_LABELS[key] ?? key} ${n(value)}`)
    .join(", ");
  if (intent === "alternatives") {
    const count = optimization.evaluated;
    const unit = optimization.scoreUnit ?? "";
    const listed = optimization.top
      .slice(0, 5)
      .map((candidate, index) => {
        const where = [candidate.configuration.temperature_c, candidate.configuration.residence_time_min];
        const setting = where[0] !== undefined && where[1] !== undefined ? ` (${n(where[0])} °C, ${n(where[1])} min)` : "";
        return `${index + 1}. ${n(candidate.score, 2)} ${unit}${setting}`.replace(/\s+/g, " ");
      })
      .join("; ");
    if (!listed) {
      if (language === "en") return `The search evaluated ${count ?? "an unrecorded number of"} points. Only the best configuration is stored${config ? `: ${config}` : ""}.`;
      return `Search ne ${count ?? "kuch"} points evaluate kiye. Sirf best configuration store hai${config ? `: ${config}` : ""}.`;
    }
    if (language === "hi") {
      return `Training range ke andar ${count} configurations mein se top ${optimization.top.length} candidates: ${listed}. Yeh model evaluations hain, experiments nahi.`;
    }
    if (language === "hinglish") {
      return `Training range ke andar ${count} configurations mein se top ${optimization.top.length} candidates: ${listed}. Yeh model evaluations hain, experiments nahi.`;
    }
    return `Of ${count} configurations evaluated inside the training range, the top ${optimization.top.length} candidates are: ${listed}. These are model evaluations, not experiments.`;
  }
  if (language === "hi") {
    return `Objective ${optimization.objective ?? "recorded objective"} hai. ${optimization.proxyNote ?? optimization.proxy ?? ""} ${optimization.statement ?? ""} Score ${optimization.score !== null ? n(optimization.score, 2) : "recorded nahi"} ${optimization.scoreUnit ?? ""}. ${config ? `Configuration: ${config}.` : ""} Yeh model estimate hai.`.replace(/\s+/g, " ").trim();
  }
  if (language === "hinglish") {
    return `Objective ${optimization.objective ?? "recorded objective"} hai. ${optimization.proxyNote ?? optimization.proxy ?? ""} ${optimization.statement ?? ""} Score ${optimization.score !== null ? n(optimization.score, 2) : "recorded nahi"} ${optimization.scoreUnit ?? ""}. ${config ? `Configuration: ${config}.` : ""}`.replace(/\s+/g, " ").trim();
  }
  return `The objective is ${optimization.objective ?? "the recorded objective"}. ${optimization.proxyNote ?? optimization.proxy ?? ""} ${optimization.statement ?? ""} The stored score is ${optimization.score !== null ? n(optimization.score, 2) : "not recorded"} ${optimization.scoreUnit ?? ""}. ${config ? `Configuration: ${config}.` : ""} This remains a model estimate.`.replace(/\s+/g, " ").trim();
}

function carbonAnswer(language: Language, evidence: Evidence): string {
  const heating = evidence.sample?.heating;
  const status = evidence.sample?.carbonStatus;
  if (!heating && !status) return MISSING[language];
  if (heating && !heating.available) {
    if (language === "en") return `A feedstock heating value is not available. ${heating.reason ?? "Elemental coverage is incomplete."} I will not estimate emissions from that gap.`;
    if (language === "hi") return `Feedstock heating value available nahi hai. ${heating.reason ?? "Elemental coverage incomplete hai."} Is gap se main emissions invent nahi karunga.`;
    return `Feedstock heating value available nahi hai. ${heating.reason ?? "Elemental coverage incomplete hai."} Is gap se main emissions nahi banaunga.`;
  }
  if (heating?.available && heating.value !== null) {
    if (language === "en") return `The Dulong estimate is ${n(heating.value, 2)} MJ/kg. ${heating.kind ?? "This is a derived estimate, not a bomb-calorimeter result, and it is not recovered energy."}`;
    return `Dulong estimate ${n(heating.value, 2)} MJ/kg hai. Yeh derived estimate hai, bomb-calorimeter result nahi, aur recovered energy bhi nahi.`;
  }
  return status ?? MISSING[language];
}

function impactAnswer(language: Language, evidence: Evidence): string {
  const status = evidence.sample?.carbonStatus;
  const lines = (evidence.sample?.pathways.flatMap((pathway) => pathway.unavailable) ?? []).filter((item) =>
    /^(Recovered energy|Economic value|Carbon impact)/i.test(item),
  );
  const detail = [status, ...lines].filter((item): item is string => Boolean(item)).slice(0, 3).join(" ");
  if (!detail) {
    return language === "en" ? "I don't have enough information to determine that." : MISSING[language];
  }
  if (language === "en") {
    return `I don't have enough information to determine an emissions reduction or a cost saving. ${detail} No emission factor or price was added to fill the gap.`;
  }
  if (language === "hi") {
    return `Emissions reduction या cost saving तय करने के लिए पर्याप्त information नहीं है। ${detail} कोई emission factor या price जोड़ा नहीं गया।`;
  }
  return `Emissions reduction ya cost saving decide karne ke liye kaafi information nahi hai. ${detail} Main beech mein koi emission factor ya price nahi jodunga.`;
}

function measuredAnswer(language: Language, evidence: Evidence): string {
  const sentence = products(evidence.sample?.prediction?.outputs, language);
  if (language === "hi") {
    return `Uploaded composition entered data hai. ${sentence ? `Product distribution model prediction hai: ${sentence}.` : "Product prediction abhi available nahi hai."} Elemental values, jahan dikhte hain, stoichiometric calculation hain. Heating value tabhi derived estimate hai jab coverage complete ho.`;
  }
  if (language === "hinglish") {
    return `Uploaded composition entered data hai. ${sentence ? `Product distribution model prediction hai: ${sentence}.` : "Product prediction abhi available nahi hai."} Elemental values stoichiometric calculation hain. Heating value tabhi derived estimate hai jab coverage complete ho.`;
  }
  return `The uploaded composition is entered data. ${sentence ? `The product distribution is a model prediction: ${sentence}.` : "A product prediction is not available yet."} Elemental values, where shown, are stoichiometric calculations. A heating value is a derived estimate only when elemental coverage is complete.`;
}

function limitationsAnswer(language: Language, evidence: Evidence): string {
  const line = evidence.docs[0];
  if (!line) return MISSING[language];
  if (language === "en") return line;
  if (language === "hi") return `Project record ke hisaab se: ${line}`;
  return `Project record ke hisaab se: ${line}`;
}

export function missingLine(language: Language): string {
  return MISSING[language];
}
