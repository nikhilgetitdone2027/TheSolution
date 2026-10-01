import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["LIMITATIONS.md", "MODEL_CARD.md", "DATASET.md", "ARCHITECTURE.md"];

let cache: string[] | null = null;

async function lines(): Promise<string[]> {
  if (cache) return cache;
  const collected: string[] = [];
  for (const file of FILES) {
    try {
      const raw = await readFile(path.join(root, file), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const cleaned = line.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim();
        if (cleaned.length > 40) collected.push(cleaned);
      }
    } catch {
      // A missing document is skipped. Saathi does not invent its contents.
    }
  }
  cache = collected;
  return collected;
}

export async function retrieveDocs(message: string): Promise<string[]> {
  const words = message
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  if (!words.length) return [];
  const scored = (await lines())
    .map((line) => {
      const hay = line.toLowerCase();
      const score = words.reduce((sum, word) => sum + (hay.includes(word) ? 1 : 0), 0);
      return { line, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.line);
  return scored;
}
