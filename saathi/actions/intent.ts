export type Intent =
  | "greet"
  | "analyze"
  | "summarize"
  | "prediction"
  | "pyrolysis"
  | "temperature"
  | "compare"
  | "importance"
  | "oil"
  | "composition"
  | "pvc"
  | "quality"
  | "model"
  | "objective"
  | "assumptions"
  | "alternatives"
  | "carbon"
  | "impact"
  | "measured"
  | "limitations"
  | "parameter"
  | "unknown";

export function detectIntent(message: string): Intent {
  const text = message.toLowerCase();
  if (/^(hi|hello|hey|namaste|namaskar|saathi)[.!?\s]*$/i.test(message.trim())) return "greet";
  if (/summarize the analysis/.test(text)) return "summarize";
  if (/analy[sz]e|analysis karke|analysis shuru|start the analysis|is waste ka analysis/.test(text)) return "analyze";
  if (/pyrolysis/.test(text)) return "pyrolysis";
  if (/before and after|what changed|kya hua|compare/.test(text)) return "compare";
  if (/temperature|temp\b|badha|badhao|badhaa/.test(text)) return "temperature";
  if (/parameter|residence|particle|feed rate/.test(text)) return "parameter";
  if (/shap|feature importance|influential|matter most|contribut|kaunse input/.test(text)) return "importance";
  if (/oil yield|oil/.test(text) && /affect|why|kaise|factor/.test(text)) return "oil";
  if (/pvc/.test(text)) return "pvc";
  if (/composition|contain|elements|stoichiometr/.test(text)) return "composition";
  if (/quality|missing data|data is missing|optional/.test(text)) return "quality";
  if (/assumption/.test(text)) return "assumptions";
  if (/alternative/.test(text)) return "alternatives";
  if (/objective|why this objective|energy recovery|material recovery/.test(text)) return "objective";
  if (/confident|accuracy|how good|metrics|mae|holdout|reliable|trust/.test(text)) return "model";
  if (/carbon|hhv|heating value/.test(text)) return "carbon";
  if (/emission|saving|economic|impact/.test(text) && !/feature/.test(text)) return "impact";
  if (/measured|predicted|illustrative|laboratory/.test(text)) return "measured";
  if (/limitation|cannot|can't do|methodology|dataset/.test(text)) return "limitations";
  if (/predict|kya ho raha|what is happening|explain this prediction|product distribution/.test(text)) return "prediction";
  if (/explain/.test(text)) return "prediction";
  return "unknown";
}

export function wantsSimple(message: string): boolean {
  return /not an ml|non-technical|simple|aasaan|seedha|like i am not|like i'm not/i.test(message);
}
