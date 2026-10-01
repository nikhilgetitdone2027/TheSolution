import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "..", "data", "store.json");

export type SampleRecord = {
  id: string;
  name: string;
  category: string;
  sourceLabel: string;
  origin: "demo" | "upload" | "manual";
  createdAt: string;
  inputs: Record<string, number | string | null>;
  validation: unknown;
  prediction: unknown;
  pathways: unknown;
  flows: unknown;
  optimization: unknown;
  explanation: unknown;
  scenarios: Array<Record<string, unknown>>;
  reportHtml: string | null;
};

type Store = { samples: SampleRecord[] };

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return { samples: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(store, null, 2), "utf8");
}

export async function listSamples(): Promise<SampleRecord[]> {
  const store = await readStore();
  return store.samples;
}

export async function getSample(id: string): Promise<SampleRecord | undefined> {
  const store = await readStore();
  return store.samples.find((sample) => sample.id === id);
}

export async function saveSample(sample: SampleRecord): Promise<SampleRecord> {
  const store = await readStore();
  const index = store.samples.findIndex((item) => item.id === sample.id);
  if (index >= 0) store.samples[index] = sample;
  else store.samples.unshift(sample);
  await writeStore(store);
  return sample;
}

export async function removeSample(id: string): Promise<void> {
  const store = await readStore();
  store.samples = store.samples.filter((sample) => sample.id !== id);
  await writeStore(store);
}

export function blankSample(
  partial: Pick<SampleRecord, "id" | "name" | "category" | "sourceLabel" | "origin" | "inputs">,
): SampleRecord {
  return {
    ...partial,
    createdAt: new Date().toISOString(),
    validation: null,
    prediction: null,
    pathways: null,
    flows: null,
    optimization: null,
    explanation: null,
    scenarios: [],
    reportHtml: null,
  };
}
