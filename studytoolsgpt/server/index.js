import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

dotenv.config();

const app = express();

// If you want to restrict CORS later, set CORS_ORIGIN=http://localhost:3000
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
  })
);

app.use(express.json({ limit: "2mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/**
 * Structured Cheat Sheet schema
 * NOTE: Structured Outputs require all fields present (no optional),
 * so arrays must exist (can be empty) and note is nullable.
 */
const CheatSheetSchema = z.object({
  title: z.string(),
  overview: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  formulas: z.array(
    z.object({
      name: z.string(),
      expression: z.string(),
      note: z.string().nullable(),
    })
  ),
  common_mistakes: z.array(z.string()),
  mini_examples: z.array(
    z.object({
      prompt: z.string(),
      steps: z.array(z.string()),
      answer: z.string(),
    })
  ),
  practice: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),
});

const RequestSchema = z.object({
  modeLabel: z.string().default("Cheat Sheet"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
    })
  ),
});

// Keep only the last N messages to control tokens/cost/latency
const MAX_MESSAGES_TO_SEND = Number(process.env.MAX_MESSAGES_TO_SEND || 20);

function buildInstruction(modeLabel) {
  return [
    "You are StudyToolsGPT, an exam-prep assistant.",
    `Mode: ${modeLabel}.`,
    "Be accurate and student-friendly.",
    "Prefer short bullets and clean structure.",
    "If the user provides notes, use them. Otherwise infer typical curriculum coverage.",
    "Do not include markdown headings unless asked; keep formatting clean.",
  ].join(" ");
}

function normalizeMessages(messages) {
  return (messages || [])
    .filter(
      (m) =>
        m &&
        typeof m.text === "string" &&
        (m.role === "user" || m.role === "assistant")
    )
    .slice(-MAX_MESSAGES_TO_SEND)
    .map((m) => ({ role: m.role, content: m.text }));
}

function isCheatSheetMode(modeLabel) {
  const mode = (modeLabel || "").toLowerCase();
  return mode.includes("cheat");
}

app.post("/api/respond", async (req, res) => {
  try {
    const parsed = RequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { modeLabel, messages } = parsed.data;

    const input = [
      { role: "system", content: buildInstruction(modeLabel) },
      ...normalizeMessages(messages),
    ];

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // Structured output ONLY for Cheat Sheet mode
    if (isCheatSheetMode(modeLabel)) {
      try {
        const response = await client.responses.parse({
          model,
          input,
          temperature: 0, // more stable formatting for schema
          text: { format: zodTextFormat(CheatSheetSchema, "cheat_sheet") },
        });

        return res.json({
          kind: "cheatsheet",
          pack: response.output_parsed,
        });
      } catch (err) {
        // If structured parsing fails, degrade gracefully to text instead of 500
        console.error("⚠️ Cheatsheet structured parse failed:", err);

        const fallback = await client.responses.create({
          model,
          input,
          temperature: 0.2,
        });

        return res.json({
          kind: "text",
          text:
            fallback.output_text ||
            "Cheat sheet generation failed. Try rewording the topic and try again.",
        });
      }
    }

    // Other modes: plain text for now
    const response = await client.responses.create({
      model,
      input,
      temperature: 0.4,
    });

    return res.json({
      kind: "text",
      text: response.output_text || "",
    });
  } catch (err) {
    console.error("❌ /api/respond error:", err);

    const message = err?.error?.message || err?.message || "Server error calling OpenAI";
    return res.status(500).json({ error: message });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => console.log(`API server running on http://localhost:${port}`));
