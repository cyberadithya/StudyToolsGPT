# StudyToolsGPT

StudyToolsGPT is a web app that turns exam prep into clean, usable study materials. It’s a focused “AI wrapper” around generative AI: instead of a generic chat UI, it provides study-specific modes and structured outputs (like cheat sheets) with a UI designed for fast review.

**Live (Frontend – GitHub Pages):** https://cyberadithya.github.io/StudyToolsGPT

---

## Why I Built This

I wanted a resume-worthy project that’s also genuinely useful for how I study. Generic AI chats *can* help with studying, but they aren’t optimized for consistent structure, fast review, or saving/reloading study sessions. StudyToolsGPT is built to feel like a study tool first—then uses AI behind the scenes.

---

## What It Does

### Study Modes (UI)
Pick a mode to guide how the assistant responds (Cheat Sheet mode is the most developed right now).

### Cheat Sheet Generator (Structured Output)
In **Cheat Sheet** mode, the backend requests **structured outputs** so the response follows a predictable schema. That enables consistent cheat sheets with sections like:
- title + overview
- key sections with bullets
- formulas (with notes when relevant)
- common mistakes
- mini examples
- quick practice Q/A

### Saved Packs
Save and reload “study packs” locally (via localStorage) so you can return to a session later.

### Clean, Responsive UI
A layout designed for real studying:
- sidebar + quick prompts
- mobile-friendly drawer behavior
- scroll-safe chat layout
- readable “study pack” rendering

---

## How It Works

**Frontend (React)**
- User selects a mode and sends prompts/notes
- Sends a request to the backend (`/api/respond`)
- Renders either:
  - standard text responses, or
  - a structured cheat sheet card when the backend returns a parsed “pack”

**Backend (Express + OpenAI)**
- Validates incoming requests with Zod
- In Cheat Sheet mode:
  - uses the OpenAI Responses API with schema-based parsing
  - returns `{ kind: "cheatsheet", pack: ... }`
  - falls back to plain text if structured parsing fails (so the app stays usable)

---

## Tech Stack

### Frontend
- React (Create React App)
- Custom CSS (responsive layout, sidebar/drawer UI)
- localStorage (saved packs)

### Backend
- Node.js + Express
- OpenAI SDK (Responses API)
- Zod (request validation + structured output schema)
- express-rate-limit (basic abuse protection)
- CORS configured via environment variables

### Deployment
- GitHub Pages (frontend)
- Render (backend)
