const base = process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8000";

export class MlError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new MlError(503, "The model service is not running.");
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      detail = await response.text();
    }
    throw new MlError(response.status, detail || "Model service request failed.");
  }
  return (await response.json()) as T;
}

export const ml = {
  health: () => call<{ status: string; model: string; dataset: string }>("/health"),
  model: () => call<Record<string, unknown>>("/model"),
  demoSamples: () =>
    call<{ label: string; samples: Array<{ id: string; name: string; category: string; inputs: Record<string, number> }> }>(
      "/demo-samples",
    ),
  parse: (csvText: string) =>
    call<{ records: Array<Record<string, unknown>>; row_count: number; duplicate_rows: Array<{ row: number; message: string }> }>(
      "/parse",
      { method: "POST", body: JSON.stringify({ csv_text: csvText }) },
    ),
  validate: (record: Record<string, unknown>, category: string, sourceLabel: string) =>
    call<Record<string, unknown>>("/validate", {
      method: "POST",
      body: JSON.stringify({ record, category, source_label: sourceLabel }),
    }),
  predict: (record: Record<string, unknown>, category: string, sourceLabel: string) =>
    call<Record<string, unknown>>("/predict", {
      method: "POST",
      body: JSON.stringify({ record, category, source_label: sourceLabel }),
    }),
  pathways: (record: Record<string, unknown>, category: string, sourceLabel: string) =>
    call<Record<string, unknown>>("/pathways", {
      method: "POST",
      body: JSON.stringify({ record, category, source_label: sourceLabel }),
    }),
  optimize: (
    record: Record<string, unknown>,
    category: string,
    sourceLabel: string,
    objective: string,
    weights?: Record<string, number>,
  ) =>
    call<Record<string, unknown>>("/optimize", {
      method: "POST",
      body: JSON.stringify({ record, category, source_label: sourceLabel, objective, weights }),
    }),
  simulate: (
    baseline: Record<string, unknown>,
    modified: Record<string, unknown>,
    category: string,
    sourceLabel: string,
  ) =>
    call<Record<string, unknown>>("/simulate", {
      method: "POST",
      body: JSON.stringify({ baseline, modified, category, source_label: sourceLabel }),
    }),
  explain: (record: Record<string, unknown>, category: string, sourceLabel: string, question: string) =>
    call<{
      answer: { answer: string; grounded: boolean; model?: string; importance_method?: string };
      importance: Array<Record<string, unknown>>;
      local_effects: Array<Record<string, unknown>>;
      dataset_label: string;
      model: string;
    }>("/explain", {
      method: "POST",
      body: JSON.stringify({ record, category, source_label: sourceLabel, question }),
    }),
  profile: (record: Record<string, unknown>, category: string, sourceLabel: string) =>
    call<Record<string, unknown>>("/profile", {
      method: "POST",
      body: JSON.stringify({ record, category, source_label: sourceLabel }),
    }),
  intelligence: (record: Record<string, unknown>, category: string, sourceLabel: string) =>
    call<Record<string, unknown>>("/intelligence", {
      method: "POST",
      body: JSON.stringify({ record, category, source_label: sourceLabel }),
    }),
};
