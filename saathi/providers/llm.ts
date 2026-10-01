import type { Language } from "../schemas/types.js";

const DIGIT = /\d/;

export async function rephrase(draft: string, language: Language, evidence: unknown): Promise<{ text: string; interpreter: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { text: draft, interpreter: "Saathi grounded answer" };
  try {
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Rephrase the draft in the requested language style. English, Hindi in Devanagari, or Hinglish in Roman script. Keep technical terms such as pyrolysis, temperature, PE, PVC, oil, gas, char, MAE, and What-If Lab. Do not add numbers, citations, yields, emissions, prices, or mechanisms that are absent from the draft. If you cannot stay faithful, return the draft unchanged.",
          },
          {
            role: "user",
            content: JSON.stringify({ language, draft, evidence }),
          },
        ],
      }),
    });
    if (!completion.ok) return { text: draft, interpreter: "Saathi grounded answer" };
    const payload = (await completion.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) return { text: draft, interpreter: "Saathi grounded answer" };
    if (introducesNumber(draft, text)) return { text: draft, interpreter: "Saathi grounded answer" };
    return { text, interpreter: "Saathi rephrased the grounded answer" };
  } catch {
    return { text: draft, interpreter: "Saathi grounded answer" };
  }
}

function introducesNumber(draft: string, next: string): boolean {
  const allowed = new Set(draft.match(/\d+(?:\.\d+)?/g) ?? []);
  const used = next.match(/\d+(?:\.\d+)?/g) ?? [];
  return used.some((value) => !allowed.has(value) && DIGIT.test(value));
}
