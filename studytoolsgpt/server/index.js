import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- Structured Cheat Sheet schema ---
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


function buildInstruction(modeLabel) {
  return [
    "You are StudyToolsGPT, an exam-prep assistant.",
    `Mode: ${modeLabel}.`,
    "Be accurate and student-friendly.",
    "Prefer short bullets and clean structure.",
    "If the user provides notes, use them. Otherwise infer typical curriculum coverage.",
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
    .map((m) => ({ role: m.role, content: m.text }));
}

app.post("/api/respond", async (req, res) => {
  try {
    const { modeLabel, messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const mode = (modeLabel || "").toLowerCase();
    const input = [
      { role: "system", content: buildInstruction(modeLabel || "Cheat Sheet") },
      ...normalizeMessages(messages),
    ];

    // Structured output ONLY for Cheat Sheet mode
    if (mode.includes("cheat")) {
      const response = await client.responses.parse({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input,
        text: { format: zodTextFormat(CheatSheetSchema, "cheat_sheet") },
      });

      return res.json({
        kind: "cheatsheet",
        pack: response.output_parsed,
      });
    }

    // Other modes: plain text for now
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input,
    });

    return res.json({
      kind: "text",
      text: response.output_text || "",
    });
  } catch (err) {
    console.error("❌ /api/respond error:", err);

    const message =
      err?.error?.message ||
      err?.message ||
      "Server error calling OpenAI";

    return res.status(500).json({ error: message });
  }

});

const port = process.env.PORT || 5050;
app.listen(port, () =>
  console.log(`API server running on http://localhost:${port}`)
);
