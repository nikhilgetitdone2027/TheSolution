import type { Language, LanguagePreference } from "../schemas/types.js";

const ROMAN_HINDI =
  /\b(kya|kyun|kyu|kaise|hai|hain|hoon|mein|batao|bata|raha|rahi|rahe|nahi|nahin|toh|agar|isko|chaliye|badha|badhao|badhaa|dein|dena|karo|karke|samajh|hisaab|baare|bhai|aapke|aapko|namaste)\b/gi;

export function detectLanguage(message: string, preference: LanguagePreference): Language {
  if (preference !== "auto") return preference;
  if (/[\u0900-\u097F]/.test(message)) return "hi";
  const hits = message.match(ROMAN_HINDI);
  if (hits && hits.length >= 2) return "hinglish";
  return "en";
}
