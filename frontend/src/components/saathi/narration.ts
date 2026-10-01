import { MATERIAL_FIELDS, finite } from "../../format";
import type { ModelMeta, Sample } from "../../types";
import type { AnalysisWorkflowState, CueId } from "../../workflow/engine";
import type { SpeechLanguage } from "./SaathiVoice";

type Lines = Record<SpeechLanguage, string>;

function n(value: number | undefined | null, digits = 1): string | null {
  return value === undefined || value === null || !Number.isFinite(value) ? null : value.toFixed(digits);
}

function topMaterials(sample: Sample | null): [string, string] | null {
  if (!sample) return null;
  const ranked = MATERIAL_FIELDS.map(([key, label]) => ({ label, value: finite(sample.inputs[key]) ?? -1 }))
    .filter((item) => item.value > 0 && item.label !== "Other")
    .sort((a, b) => b.value - a.value);
  if (ranked.length < 2) return null;
  return [`${ranked[0]?.label} ${ranked[0]?.value.toFixed(1)}%`, `${ranked[1]?.label} ${ranked[1]?.value.toFixed(1)}%`];
}

export function narrationFor(
  cue: CueId,
  language: SpeechLanguage,
  context: { engine: AnalysisWorkflowState; sample: Sample | null; model: ModelMeta | null },
): string | null {
  const { engine, sample, model } = context;
  const pick = (lines: Lines) => lines[language];
  const out = engine.data.prediction?.output_map ?? sample?.prediction?.output_map;
  const oil = n(out?.oil_pct);
  const gas = n(out?.gas_pct);
  const char = n(out?.char_pct);
  const other = n(out?.other_product_pct);
  const modelName = model?.selected.model ?? "trained";

  switch (cue) {
    case "sample":
      return sample
        ? pick({
            en: `Let's start with the sample, ${sample.name}.`,
            hi: `चलिए sample से शुरू करते हैं, ${sample.name}।`,
            hinglish: `Chaliye sample se shuru karte hain, ${sample.name}.`,
          })
        : null;
    case "composition": {
      const top = topMaterials(sample);
      return pick({
        en: `First, I'm reading the material composition.${top ? ` The largest fractions are ${top[0]} and ${top[1]}.` : ""}`,
        hi: `पहले मैं material composition पढ़ रहा हूँ।${top ? ` सबसे बड़े fractions ${top[0]} और ${top[1]} हैं।` : ""}`,
        hinglish: `Pehle main material composition padh raha hoon.${top ? ` Sabse bade fractions ${top[0]} aur ${top[1]} hain.` : ""}`,
      });
    }
    case "validation":
      return pick({
        en: "Next, I'm checking whether the material fractions form a valid balance and the inputs are inside the supported range.",
        hi: "अब मैं check कर रहा हूँ कि material fractions का balance सही है और inputs supported range में हैं।",
        hinglish: "Ab main check kar raha hoon ki material fractions ka balance sahi hai aur inputs supported range mein hain.",
      });
    case "validated": {
      const quality = engine.data.validation?.quality_score;
      return pick({
        en: `The inputs are valid.${quality !== undefined ? ` Data quality is ${quality} percent.` : ""}`,
        hi: `Inputs valid हैं।${quality !== undefined ? ` Data quality ${quality} percent है।` : ""}`,
        hinglish: `Inputs valid hain.${quality !== undefined ? ` Data quality ${quality} percent hai.` : ""}`,
      });
    }
    case "invalid":
      return pick({
        en: `Validation stopped the analysis. ${engine.error ?? ""}`,
        hi: `Validation ने analysis रोक दिया। ${engine.error ?? ""}`,
        hinglish: `Validation ne analysis rok diya. ${engine.error ?? ""}`,
      });
    case "ml":
      return pick({
        en: `Now I'm sending the supported inputs to the ${modelName} model.`,
        hi: `अब मैं supported inputs ${modelName} model को भेज रहा हूँ।`,
        hinglish: `Ab main supported inputs ${modelName} model ko bhej raha hoon.`,
      });
    case "prediction":
      if (!oil || !gas || !char || !other) {
        return pick({
          en: "The model could not return a prediction for this sample.",
          hi: "Model इस sample के लिए prediction नहीं दे सका।",
          hinglish: "Model is sample ke liye prediction nahi de paya.",
        });
      }
      return pick({
        en: `The model estimates oil at ${oil} percent, gas ${gas}, char ${char}, and other products ${other} percent. This is a model prediction, not a laboratory measurement.`,
        hi: `Model के हिसाब से oil ${oil} percent, gas ${gas}, char ${char}, और other products ${other} percent हैं। यह model prediction है, laboratory measurement नहीं।`,
        hinglish: `Model ke hisaab se oil ${oil} percent, gas ${gas}, char ${char}, aur other products ${other} percent hain. Yeh model prediction hai, laboratory measurement nahi.`,
      });
    case "product_flow":
      return pick({
        en: "Here is the same distribution as a flow. Each lane's width follows the predicted percentage.",
        hi: "यही distribution flow के रूप में। हर lane की width predicted percentage के हिसाब से है।",
        hinglish: "Yahi distribution flow ke roop mein. Har lane ki width predicted percentage ke hisaab se hai.",
      });
    case "explanation": {
      const rows = [...(engine.data.importance ?? model?.feature_importance.rows ?? [])]
        .sort((a, b) => b.mean_mae_increase - a.mean_mae_increase)
        .slice(0, 3)
        .map((row) => row.label);
      if (!rows.length) return null;
      const list = rows.join(", ");
      return pick({
        en: `The model responds most to ${list}. This is permutation importance. It does not establish physical causation.`,
        hi: `Model सबसे ज़्यादा ${list} पर respond करता है। यह permutation importance है, physical causation नहीं।`,
        hinglish: `Model sabse zyada ${list} par respond karta hai. Yeh permutation importance hai, physical causation nahi.`,
      });
    }
    case "optimization":
      return pick({
        en: "Now let's see what the optimizer finds within the range covered by the training data.",
        hi: "अब देखते हैं optimizer training data की range के अंदर क्या ढूँढता है।",
        hinglish: "Ab dekhte hain optimizer training data ki range ke andar kya dhoondta hai.",
      });
    case "optimized": {
      const optimization = engine.data.optimization ?? sample?.optimization;
      const config = optimization?.best?.configuration;
      const temp = n(config?.temperature_c);
      const time = n(config?.residence_time_min);
      const score = n(optimization?.best?.score, 2);
      const count = optimization?.evaluated;
      if (!optimization?.available || !temp || !time) return null;
      return pick({
        en: `Across ${count} configurations, the best model-supported setting is ${temp} degrees and ${time} minutes, with a proxy score of ${score}. That is a model search, not an experiment.`,
        hi: `${count} configurations में से सबसे अच्छा model-supported setting ${temp} degree और ${time} minute है, proxy score ${score}। यह model search है, experiment नहीं।`,
        hinglish: `${count} configurations mein best model-supported setting ${temp} degree aur ${time} minute hai, proxy score ${score}. Yeh model search hai, experiment nahi.`,
      });
    }
    case "optimization_skipped":
      return pick({
        en: `Optimization was not run. ${engine.steps.optimization.detail ?? ""}`,
        hi: `Optimization नहीं चला। ${engine.steps.optimization.detail ?? ""}`,
        hinglish: `Optimization nahi chala. ${engine.steps.optimization.detail ?? ""}`,
      });
    case "complete":
      return pick({
        en: "The analysis is complete. Everything shown is a model-based estimate, not a laboratory measurement.",
        hi: "Analysis पूरा हो गया। जो दिख रहा है वह model-based estimate है, laboratory measurement नहीं।",
        hinglish: "Analysis complete ho gaya. Jo dikh raha hai woh model-based estimate hai, laboratory measurement nahi.",
      });
    case "error":
      return pick({
        en: `I couldn't complete that step. ${engine.error ?? ""}`,
        hi: `मैं यह step पूरा नहीं कर सका। ${engine.error ?? ""}`,
        hinglish: `Main yeh step complete nahi kar paya. ${engine.error ?? ""}`,
      });
    case "whatif": {
      const scenario = engine.data.scenario;
      const change = scenario?.changes[0];
      if (!scenario || !change) return null;
      const before = n(scenario.before.oil_pct);
      const after = n(scenario.after.oil_pct);
      const charBefore = n(scenario.before.char_pct);
      const charAfter = n(scenario.after.char_pct);
      return pick({
        en: `${change.label} changed from ${change.from.toFixed(1)} to ${change.to.toFixed(1)} ${change.unit}. The model now estimates oil at ${after} percent instead of ${before}, and char at ${charAfter} instead of ${charBefore}.`,
        hi: `${change.label} ${change.from.toFixed(1)} से ${change.to.toFixed(1)} ${change.unit} हुआ। अब model oil ${before} की जगह ${after} percent और char ${charBefore} की जगह ${charAfter} estimate करता है।`,
        hinglish: `${change.label} ${change.from.toFixed(1)} se ${change.to.toFixed(1)} ${change.unit} hua. Ab model oil ${before} ki jagah ${after} percent aur char ${charBefore} ki jagah ${charAfter} estimate kar raha hai.`,
      });
    }
    case "trust":
      return pick({
        en: "The important distinction: the composition is entered data, the product split is a model prediction, the balance and elements are calculations, and the training data is illustrative.",
        hi: "ज़रूरी फ़र्क: composition entered data है, product split model prediction है, balance और elements calculation हैं, और training data illustrative है।",
        hinglish: "Important farq yeh hai: composition entered data hai, product split model prediction hai, balance aur elements calculation hain, aur training data illustrative hai.",
      });
    case "summary":
      return pick({
        en: `To summarize: ${sample?.name ?? "the sample"} passed validation${oil ? `, the model estimated ${oil} percent oil` : ""}, and the optimizer searched only inside the training range. Treat this as decision support that still needs laboratory confirmation.`,
        hi: `सार: ${sample?.name ?? "sample"} validation पास हुआ${oil ? `, model ने ${oil} percent oil estimate किया` : ""}, और optimizer ने सिर्फ़ training range के अंदर search किया। इसे decision support मानिए, जिसे laboratory confirmation चाहिए।`,
        hinglish: `Summary: ${sample?.name ?? "sample"} validation pass hua${oil ? `, model ne ${oil} percent oil estimate kiya` : ""}, aur optimizer ne sirf training range ke andar search kiya. Ise decision support samjhiye, jise abhi laboratory confirmation chahiye.`,
      });
    default:
      return null;
  }
}
