import "dotenv/config";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { handleTurn } from "../../saathi/index.js";
import { PAGES } from "../../saathi/schemas/types.js";
import { MlError, ml } from "./ml.js";
import { renderReport } from "./report.js";
import { blankSample, getSample, listSamples, removeSample, saveSample, type SampleRecord } from "./store.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const categories = ["mixed_plastic", "organic", "msw", "industrial"] as const;

function sendError(response: express.Response, error: unknown) {
  if (error instanceof MlError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof z.ZodError) {
    response.status(400).json({ error: "The request is missing required fields.", details: error.issues });
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  response.status(500).json({ error: message });
}

function event(response: express.Response, name: string, data: unknown) {
  response.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

app.get("/api/health", async (_request, response) => {
  try {
    const model = await ml.health();
    response.json({ api: "ok", model });
  } catch (error) {
    response.status(503).json({
      api: "ok",
      model: null,
      error: error instanceof Error ? error.message : "Model service unavailable.",
    });
  }
});

app.get("/api/models", async (_request, response) => {
  try {
    response.json(await ml.model());
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/template.csv", (_request, response) => {
  response
    .type("text/csv")
    .send(
      "pe_pct,pp_pct,pet_pct,ps_pct,pvc_pct,other_pct,moisture_pct,particle_size_mm,feed_rate_kg_h,temperature_c,residence_time_min\n",
    );
});

app.get("/api/samples", async (_request, response) => {
  response.json({ samples: await listSamples() });
});

app.get("/api/samples/:id", async (request, response) => {
  const sample = await getSample(request.params.id);
  if (!sample) {
    response.status(404).json({ error: "Sample not found." });
    return;
  }
  response.json(sample);
});

app.delete("/api/samples/:id", async (request, response) => {
  await removeSample(request.params.id);
  response.json({ ok: true });
});

app.post("/api/demo/:demoId", async (request, response) => {
  try {
    const catalog = await ml.demoSamples();
    const found = catalog.samples.find((item) => item.id === request.params.demoId);
    if (!found) {
      response.status(404).json({ error: "Demo sample not found." });
      return;
    }
    const sample = blankSample({
      id: randomUUID(),
      name: found.name,
      category: found.category,
      sourceLabel: catalog.label,
      origin: "demo",
      inputs: found.inputs,
    });
    response.status(201).json(await saveSample(sample));
  } catch (error) {
    sendError(response, error);
  }
});

const manualSchema = z.object({
  name: z.string().min(1).max(140),
  category: z.enum(categories),
  inputs: z.record(z.union([z.number(), z.string(), z.null()])),
});

app.post("/api/samples", async (request, response) => {
  try {
    const body = manualSchema.parse(request.body);
    const sample = blankSample({
      id: randomUUID(),
      name: body.name,
      category: body.category,
      sourceLabel: "Manually entered values",
      origin: "manual",
      inputs: body.inputs,
    });
    response.status(201).json(await saveSample(sample));
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/samples/csv", async (request, response) => {
  try {
    const body = z
      .object({
        filename: z.string().default("upload.csv"),
        csvText: z.string().min(1),
        category: z.enum(categories).default("mixed_plastic"),
      })
      .parse(request.body);
    const parsed = await ml.parse(body.csvText);
    const created: SampleRecord[] = [];
    for (const [index, record] of parsed.records.entries()) {
      const nameValue = record.sample_id ?? record.name;
      const sample = blankSample({
        id: randomUUID(),
        name: typeof nameValue === "string" && nameValue ? nameValue : `${body.filename} row ${index + 1}`,
        category: body.category,
        sourceLabel: "Uploaded dataset",
        origin: "upload",
        inputs: record as Record<string, number | string | null>,
      });
      created.push(await saveSample(sample));
    }
    response.status(201).json({ samples: created, duplicateRows: parsed.duplicate_rows, rowCount: parsed.row_count });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/samples/:id/inputs", async (request, response) => {
  try {
    const sample = await getSample(request.params.id);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    const body = z.object({ inputs: z.record(z.union([z.number(), z.string(), z.null()])) }).parse(request.body);
    sample.inputs = { ...sample.inputs, ...body.inputs };
    sample.sourceLabel = sample.origin === "demo" ? "Edited from demo dataset" : "Edited from uploaded dataset";
    sample.validation = null;
    sample.prediction = null;
    sample.pathways = null;
    sample.flows = null;
    sample.optimization = null;
    sample.explanation = null;
    response.json(await saveSample(sample));
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/samples/:id/validate", async (request, response) => {
  try {
    const sample = await getSample(request.params.id);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    sample.validation = await ml.validate(sample.inputs, sample.category, sample.sourceLabel);
    response.json(await saveSample(sample));
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/samples/:id/analyze", async (request, response) => {
  const sample = await getSample(request.params.id);
  if (!sample) {
    response.status(404).json({ error: "Sample not found." });
    return;
  }
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();
  const objective = typeof request.body?.objective === "string" ? request.body.objective : "energy_recovery";
  const weights = request.body?.weights as Record<string, number> | undefined;
  try {
    event(response, "stage", { id: "ingest", label: "Ingesting sample", status: "complete", detail: sample.name });
    event(response, "stage", { id: "validate", label: "Validating composition", status: "running" });
    sample.validation = await ml.validate(sample.inputs, sample.category, sample.sourceLabel);
    const validation = sample.validation as { prediction_allowed?: boolean; blocking_reasons?: string[]; quality_score?: number };
    event(response, "stage", {
      id: "validate",
      label: "Validating composition",
      status: "complete",
      detail: `Data quality ${validation.quality_score ?? "—"}`,
      payload: { validation: sample.validation },
    });
    if (!validation.prediction_allowed) {
      await saveSample(sample);
      event(response, "halted", {
        reason: (validation.blocking_reasons ?? ["Prediction unavailable."]).join(" "),
        sample,
      });
      response.end();
      return;
    }
    event(response, "stage", { id: "predict", label: "Running prediction model", status: "running" });
    const pathwayResult = (await ml.pathways(sample.inputs, sample.category, sample.sourceLabel)) as {
      prediction: unknown;
      comparison: unknown;
      flows: unknown;
    };
    sample.prediction = pathwayResult.prediction;
    sample.pathways = pathwayResult.comparison;
    sample.flows = pathwayResult.flows;
    event(response, "stage", {
      id: "predict",
      label: "Running prediction model",
      status: "complete",
      payload: { prediction: sample.prediction },
    });
    event(response, "stage", { id: "pathways", label: "Comparing pathways", status: "complete" });
    event(response, "stage", { id: "explain", label: "Generating explanation", status: "running" });
    sample.explanation = await ml.explain(
      sample.inputs,
      sample.category,
      sample.sourceLabel,
      "Why did the model produce this product distribution?",
    );
    event(response, "stage", {
      id: "explain",
      label: "Generating explanation",
      status: "complete",
      payload: { importance: (sample.explanation as { importance?: unknown }).importance ?? [] },
    });
    event(response, "stage", { id: "optimize", label: "Running optimization", status: "running" });
    sample.optimization = await ml.optimize(sample.inputs, sample.category, sample.sourceLabel, objective, weights);
    const optimization = sample.optimization as { available?: boolean; reason?: string; evaluated?: number };
    event(response, "stage", {
      id: "optimize",
      label: "Running optimization",
      status: optimization.available ? "complete" : "skipped",
      detail: optimization.available ? `${optimization.evaluated} configurations evaluated` : optimization.reason,
      payload: { optimization: sample.optimization },
    });
    await saveSample(sample);
    event(response, "stage", { id: "done", label: "Analysis complete", status: "complete" });
    event(response, "done", { sample });
    response.end();
  } catch (error) {
    event(response, "error", { message: error instanceof Error ? error.message : "Analysis failed." });
    response.end();
  }
});

app.post("/api/predict", async (request, response) => {
  try {
    const body = z.object({ sampleId: z.string() }).parse(request.body);
    const sample = await getSample(body.sampleId);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    sample.prediction = await ml.predict(sample.inputs, sample.category, sample.sourceLabel);
    response.json(await saveSample(sample));
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/optimize", async (request, response) => {
  try {
    const body = z
      .object({
        sampleId: z.string(),
        objective: z.string(),
        weights: z.record(z.number()).optional(),
      })
      .parse(request.body);
    const sample = await getSample(body.sampleId);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    sample.optimization = await ml.optimize(
      sample.inputs,
      sample.category,
      sample.sourceLabel,
      body.objective,
      body.weights,
    );
    response.json(await saveSample(sample));
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/simulate", async (request, response) => {
  try {
    const body = z
      .object({
        sampleId: z.string(),
        modified: z.record(z.union([z.number(), z.string(), z.null()])),
        saveAs: z.string().optional(),
      })
      .parse(request.body);
    const sample = await getSample(body.sampleId);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    const result = await ml.simulate(sample.inputs, { ...sample.inputs, ...body.modified }, sample.category, sample.sourceLabel);
    if (body.saveAs) {
      const after = result.after as { output_map?: Record<string, number> };
      sample.scenarios = [
        ...sample.scenarios.filter((item) => item.name !== body.saveAs),
        {
          name: body.saveAs,
          configuration: body.modified,
          outputs: after?.output_map ?? null,
          kind: "Model estimate",
        },
      ];
      await saveSample(sample);
    }
    response.json({ ...result, sampleId: sample.id });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/reports", async (request, response) => {
  try {
    const body = z.object({ sampleId: z.string() }).parse(request.body);
    const sample = await getSample(body.sampleId);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    sample.reportHtml = renderReport(sample);
    await saveSample(sample);
    response.json({ html: sample.reportHtml });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/assistant", async (request, response) => {
  try {
    const body = z.object({ sampleId: z.string(), question: z.string().min(1) }).parse(request.body);
    const sample = await getSample(body.sampleId);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    const grounded = await ml.explain(sample.inputs, sample.category, sample.sourceLabel, body.question);
    let answer = grounded.answer.answer;
    let interpreter = "Grounded explanation engine";
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
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
                  "You rephrase the supplied evidence for an operator. Use only facts present in the evidence JSON. If a number, citation, or mechanism is absent, do not add it. Keep the labels model estimate, derived estimate, and illustrative dataset when they appear.",
              },
              {
                role: "user",
                content: JSON.stringify({ question: body.question, evidence: grounded }),
              },
            ],
          }),
        });
        if (completion.ok) {
          const payload = (await completion.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = payload.choices?.[0]?.message?.content;
          if (text) {
            answer = text;
            interpreter = "Language model rephrasing the grounded evidence";
          }
        }
      } catch {
        interpreter = "Grounded explanation engine";
      }
    }
    sample.explanation = { ...grounded, answer: { ...grounded.answer, answer }, interpreter };
    await saveSample(sample);
    response.json({ answer, interpreter, importance: grounded.importance, localEffects: grounded.local_effects, model: grounded.model });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/saathi", async (request, response) => {
  try {
    const body = z
      .object({
        message: z.string().trim().min(1).max(2000),
        language: z.enum(["auto", "en", "hi", "hinglish"]),
        page: z.enum(PAGES),
        sampleId: z.string().optional(),
        simulation: z
          .object({
            before: z.record(z.number()),
            after: z.record(z.number()),
            changes: z
              .array(
                z.object({
                  key: z.string(),
                  label: z.string(),
                  from: z.number(),
                  to: z.number(),
                  unit: z.string(),
                }),
              )
              .max(12),
          })
          .nullable()
          .optional(),
      })
      .parse(request.body);
    const sample = body.sampleId ? await getSample(body.sampleId) : undefined;
    if (body.sampleId && !sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    let profile: unknown = null;
    if (sample && !sample.pathways) {
      try {
        profile = await ml.profile(sample.inputs, sample.category, sample.sourceLabel);
      } catch {
        profile = null;
      }
    }
    let model: unknown = null;
    try {
      model = await ml.model();
    } catch {
      model = null;
    }
    response.json(
      await handleTurn({
        message: body.message,
        language: body.language,
        page: body.page,
        sample: sample ?? null,
        model,
        profile,
        simulation: body.simulation ?? null,
      }),
    );
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/samples/:id/profile", async (request, response) => {
  try {
    const sample = await getSample(request.params.id);
    if (!sample) {
      response.status(404).json({ error: "Sample not found." });
      return;
    }
    response.json(await ml.profile(sample.inputs, sample.category, sample.sourceLabel));
  } catch (error) {
    sendError(response, error);
  }
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`CHEM2ENERGY API listening on ${port}`);
});
