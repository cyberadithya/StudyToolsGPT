import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildDeveloperInstruction(modeLabel) {
  // Keep this simple for Phase 1. We’ll make it mode-specific + structured later. Hi
  return [
    "You are StudyToolsGPT, a study assistant.",
    `Current mode: ${modeLabel}.`,
    "Be concise and helpful. Prefer well-structured Markdown.",
    "If the user provides a topic, produce study-ready output.",
  ].join(" ");
}

app.post("/api/respond", async (req, res) => {
  try {
    const { modeLabel, messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const input = [
      { role: "developer", content: buildDeveloperInstruction(modeLabel || "Cheat Sheet") },
      ...messages
        .filter((m) => m && typeof m.text === "string" && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role,
          content: m.text,
        })),
    ];

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input,
    });

    // The SDK provides output_text as a convenience aggregator
    return res.json({ text: response.output_text || "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error calling OpenAI" });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => console.log(`API server running on http://localhost:${port}`));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

