import { detectIntent, wantsSimple } from "./actions/intent.js";
import { readModel, readSample, readSimulation } from "./context/evidence.js";
import { detectLanguage } from "./context/language.js";
import { compose } from "./prompts/compose.js";
import { rephrase } from "./providers/llm.js";
import { retrieveDocs } from "./retrieval/docs.js";
import type { LanguagePreference, PageId, TurnResult } from "./schemas/types.js";
import { selectTools } from "./tools/registry.js";

export async function handleTurn(input: {
  message: string;
  language: LanguagePreference;
  page: PageId;
  sample: unknown;
  model: unknown;
  profile: unknown;
  simulation: unknown;
}): Promise<TurnResult> {
  const language = detectLanguage(input.message, input.language);
  const intent = detectIntent(input.message);
  const evidence = {
    page: input.page,
    sample: readSample(input.sample, input.profile),
    model: readModel(input.model),
    simulation: readSimulation(input.simulation),
    docs: intent === "limitations" || intent === "unknown" || intent === "model" ? await retrieveDocs(input.message) : [],
  };
  const selected = selectTools(intent, evidence);
  const draft = compose(language, intent, evidence, wantsSimple(input.message));
  const voiced = await rephrase(draft, language, {
    page: evidence.page,
    tools: selected.toolsUsed,
    dataset: evidence.model?.datasetLabel ?? null,
    source: evidence.sample?.sourceLabel ?? null,
  });
  return {
    text: voiced.text,
    language,
    actions: selected.actions,
    toolsUsed: selected.toolsUsed,
    interpreter: voiced.interpreter,
  };
}
