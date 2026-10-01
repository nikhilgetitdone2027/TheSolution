import type { Profile, Sample, Simulation } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let message = "Request failed.";
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ api: string; model: { status: string; model: string; dataset: string } | null; error?: string }>("/api/health"),
  model: () => request<import("./types").ModelMeta>("/api/models"),
  samples: () => request<{ samples: Sample[] }>("/api/samples"),
  sample: (id: string) => request<Sample>(`/api/samples/${id}`),
  demo: (id: string) => request<Sample>(`/api/demo/${id}`, { method: "POST" }),
  manual: (body: { name: string; category: string; inputs: Record<string, number | null> }) =>
    request<Sample>("/api/samples", { method: "POST", body: JSON.stringify(body) }),
  csv: (body: { filename: string; csvText: string; category: string }) =>
    request<{ samples: Sample[]; duplicateRows: Array<{ row: number; message: string }>; rowCount: number }>("/api/samples/csv", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  inputs: (id: string, inputs: Record<string, number | null>) =>
    request<Sample>(`/api/samples/${id}/inputs`, { method: "POST", body: JSON.stringify({ inputs }) }),
  validate: (id: string) => request<Sample>(`/api/samples/${id}/validate`, { method: "POST" }),
  profile: (id: string) => request<Profile>(`/api/samples/${id}/profile`),
  optimize: (sampleId: string, objective: string, weights?: Record<string, number>) =>
    request<Sample>("/api/optimize", { method: "POST", body: JSON.stringify({ sampleId, objective, weights }) }),
  simulate: (sampleId: string, modified: Record<string, number>, saveAs?: string) =>
    request<Simulation & { sampleId: string }>("/api/simulate", {
      method: "POST",
      body: JSON.stringify({ sampleId, modified, saveAs }),
    }),
  report: (sampleId: string) => request<{ html: string }>("/api/reports", { method: "POST", body: JSON.stringify({ sampleId }) }),
  ask: (sampleId: string, question: string) =>
    request<{ answer: string; interpreter: string; model: string }>("/api/assistant", {
      method: "POST",
      body: JSON.stringify({ sampleId, question }),
    }),
  saathi: (body: {
    message: string;
    language: "auto" | "en" | "hi" | "hinglish";
    page: string;
    sampleId?: string;
    simulation: {
      before: Record<string, number>;
      after: Record<string, number>;
      changes: Array<{ key: string; label: string; from: number; to: number; unit: string }>;
    } | null;
  }) =>
    request<{
      text: string;
      language: "en" | "hi" | "hinglish";
      actions: Array<{ type: "navigate"; page: string } | { type: "run_analysis" }>;
      toolsUsed: string[];
      interpreter: string;
    }>("/api/saathi", { method: "POST", body: JSON.stringify(body) }),
};
