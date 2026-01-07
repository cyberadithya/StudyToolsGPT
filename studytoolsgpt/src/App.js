import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import studyLogo from "./assets/newstudylogo.png";
import addIcon from "./assets/add-30.png";
import msgIcon from "./assets/message.svg";
import home from "./assets/home.svg";
import saved from "./assets/bookmark.svg";
import upgrade from "./assets/rocket.svg";
import sendBtn from "./assets/send.svg";
import userIcon from "./assets/user-icon.png";
import gptImgLogo from "./assets/chatgptLogo.svg";

const STORAGE_KEY = "studypacks_v1";

const RAW_API_BASE = process.env.REACT_APP_API_BASE || "";
const API_BASE = RAW_API_BASE.replace(/\/+$/, ""); // remove trailing slashes


// Optional guard against accidentally pasting a whole textbook
const MAX_INPUT_CHARS = 8000;

const MODES = [
  { id: "cheatsheet", label: "Cheat Sheet" },
  { id: "practice", label: "Practice Problems" },
  { id: "flashcards", label: "Flashcards" },
  { id: "explain", label: "Explain Concept" },
  { id: "plan", label: "Study Plan" },
];

function makeId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function ensureMessageIds(msgs) {
  if (!Array.isArray(msgs)) return [];
  return msgs.map((m) => {
    if (!m || typeof m !== "object") return { id: makeId(), role: "assistant", kind: "text", text: "" };
    return { id: m.id ?? makeId(), ...m };
  });
}

function shortTitleFromMessages(modeLabel, messages) {
  const firstUser = messages.find((m) => m.role === "user")?.text?.trim();
  if (!firstUser) return `${modeLabel} Pack`;
  const cleaned = firstUser.replace(/\s+/g, " ");
  return cleaned.length > 44 ? cleaned.slice(0, 44) + "…" : cleaned;
}

function packToMarkdown(pack) {
  if (!pack) return "";

  const lines = [];
  if (pack.title) lines.push(`# ${pack.title}`);
  if (pack.overview) lines.push(`\n${pack.overview}\n`);

  if (Array.isArray(pack.sections) && pack.sections.length) {
    for (const s of pack.sections) {
      lines.push(`\n## ${s.heading ?? "Section"}`);
      const bullets = Array.isArray(s.bullets) ? s.bullets : [];
      for (const b of bullets) lines.push(`- ${b}`);
    }
  }

  if (Array.isArray(pack.formulas) && pack.formulas.length) {
    lines.push(`\n## Key formulas`);
    for (const f of pack.formulas) {
      const note = f.note != null && String(f.note).trim() !== "" ? ` — ${f.note}` : "";
      lines.push(`- **${f.name ?? "Formula"}**: \`${f.expression ?? ""}\`${note}`);
    }
  }

  if (Array.isArray(pack.common_mistakes) && pack.common_mistakes.length) {
    lines.push(`\n## Common mistakes`);
    for (const m of pack.common_mistakes) lines.push(`- ${m}`);
  }

  if (Array.isArray(pack.mini_examples) && pack.mini_examples.length) {
    lines.push(`\n## Mini examples`);
    for (const ex of pack.mini_examples) {
      lines.push(`\n**${ex.prompt ?? "Example"}**`);
      const steps = Array.isArray(ex.steps) ? ex.steps : [];
      for (let i = 0; i < steps.length; i++) lines.push(`${i + 1}. ${steps[i]}`);
      if (ex.answer) lines.push(`**Answer:** ${ex.answer}`);
    }
  }

  if (Array.isArray(pack.practice) && pack.practice.length) {
    lines.push(`\n## Quick practice`);
    for (const p of pack.practice) {
      lines.push(`\n**Q:** ${p.question ?? ""}`);
      lines.push(`**A:** ${p.answer ?? ""}`);
    }
  }

  return lines.join("\n");
}

function messageToCopyText(m) {
  if (!m) return "";
  if (m.kind === "cheatsheet") return packToMarkdown(m.pack);
  return m.text ?? "";
}

function CheatSheetCard({ pack }) {
  if (!pack) return null;

  return (
    <div className="packCard">
      <div className="packHeader">
        <div className="packTitle">{pack.title}</div>
        <div className="packOverview">{pack.overview}</div>
      </div>

      {pack.sections?.map((s, idx) => (
        <div key={idx} className="packSection">
          <div className="packHeading">{s.heading}</div>
          <ul className="packList">
            {s.bullets?.map((b, j) => (
              <li key={j}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {pack.formulas?.length > 0 && (
        <div className="packBlock">
          <div className="packHeading">Key formulas</div>
          <div className="formulaGrid">
            {pack.formulas.map((f, idx) => (
              <div key={idx} className="formulaCard">
                <div className="formulaName">{f.name}</div>
                <pre className="formulaExpr">{f.expression}</pre>
                {f.note != null && String(f.note).trim() !== "" ? (
                  <div className="formulaNote">{f.note}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {pack.common_mistakes?.length > 0 && (
        <div className="packBlock">
          <div className="packHeading">Common mistakes</div>
          <ul className="packList">
            {pack.common_mistakes.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {pack.mini_examples?.length > 0 && (
        <div className="packBlock">
          <div className="packHeading">Mini examples</div>
          <div className="exampleGrid">
            {pack.mini_examples.map((ex, idx) => (
              <div key={idx} className="exampleCard">
                <div className="examplePrompt">{ex.prompt}</div>
                <ol className="exampleSteps">
                  {ex.steps?.map((st, j) => (
                    <li key={j}>{st}</li>
                  ))}
                </ol>
                <div className="exampleAnswer">
                  <span>Answer:</span> {ex.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pack.practice?.length > 0 && (
        <div className="packBlock">
          <div className="packHeading">Quick practice</div>
          <div className="practiceGrid">
            {pack.practice.map((p, idx) => (
              <div key={idx} className="practiceCard">
                <div className="practiceQ">{p.question}</div>
                <div className="practiceA">{p.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState(MODES[0].id);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState(() =>
    ensureMessageIds([
      {
        role: "assistant",
        kind: "text",
        text: "What are you studying today? Pick a mode and paste notes or a topic.",
      },
    ])
  );

  const [packs, setPacks] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return safeParse(raw, []);
    } catch {
      return [];
    }
  });

  const [activePackId, setActivePackId] = useState(null);
  const [toast, setToast] = useState(null);

  // Robustness for network calls
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef(null);
  const latestReqRef = useRef(0);

  const chatsRef = useRef(null);
  const textareaRef = useRef(null);

  const modeLabel = useMemo(() => {
    return MODES.find((m) => m.id === mode)?.label ?? "Cheat Sheet";
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
    } catch {
      // ignore storage failures
    }
  }, [packs]);

  useEffect(() => {
    const el = chatsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(160, ta.scrollHeight) + "px";
  }, [input]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const closeSidebar = () => setSidebarOpen(false);

  const showToast = (text) => setToast(text);

  const cancelInFlight = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setIsSending(false);
  };

  const startNewChat = () => {
    cancelInFlight();
    setMessages(
      ensureMessageIds([
        { role: "assistant", kind: "text", text: "New chat started. What topic should we work on?" },
      ])
    );
    setInput("");
    setActivePackId(null);
    closeSidebar();
  };

  const toServerMessages = (msgs) =>
    msgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const text =
          m.kind === "cheatsheet" && m.pack
            ? packToMarkdown(m.pack)
            : (m.text ?? "");

        return { role: m.role, text };
      });


  const sendMessage = async (text) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    if (isSending) {
      showToast("Wait for the current response…");
      return;
    }

    if (trimmed.length > MAX_INPUT_CHARS) {
      showToast(`Message too long (${trimmed.length} chars). Try shortening.`);
      return;
    }

    setIsSending(true);

    // Abort any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++latestReqRef.current;

    const userMsg = { id: makeId(), role: "user", kind: "text", text: trimmed };
    const placeholderId = makeId();
    const thinkingMsg = {
      id: placeholderId,
      role: "assistant",
      kind: "text",
      text: "Thinking…",
    };

    // UI messages (includes placeholder)
    const nextMessages = [...messages, userMsg, thinkingMsg];
    setMessages(nextMessages);
    setInput("");

    // Server messages (exclude placeholder to keep prompt clean)
    const serverMessages = [...messages, userMsg];

    try {
      const resp = await fetch(`${API_BASE}/api/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          modeLabel,
          messages: toServerMessages(serverMessages),
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Request failed");

      // Ignore if a newer request started
      if (reqId !== latestReqRef.current) return;

      const assistantMsg =
        data.kind === "cheatsheet"
          ? {
              id: placeholderId,
              role: "assistant",
              kind: "cheatsheet",
              pack: data.pack,
              text: "",
            }
          : {
              id: placeholderId,
              role: "assistant",
              kind: "text",
              text: data.text || "(No response)",
            };

      // Replace the placeholder by ID (safe even if messages changed)
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? assistantMsg : m))
      );
    } catch (e) {
      if (e.name === "AbortError") return;
      if (reqId !== latestReqRef.current) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                id: placeholderId,
                role: "assistant",
                kind: "text",
                text: `Error: ${e.message}`,
              }
            : m
        )
      );
    } finally {
      if (reqId === latestReqRef.current) setIsSending(false);
    }
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (isSending) return;

    // Enter sends; Shift+Enter makes a newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const quickAsk = (prompt) => {
    sendMessage(prompt);
    closeSidebar();
  };

  const saveCurrentPack = () => {
    const meaningful = messages.some(
      (m) => m.role === "user" && (m.text ?? "").trim().length > 0
    );
    if (!meaningful) {
      showToast("Add a prompt first, then save.");
      return;
    }

    const title = shortTitleFromMessages(modeLabel, messages);
    const now = new Date().toISOString();

    setPacks((prev) => {
      if (activePackId) {
        return prev
          .map((p) =>
            p.id === activePackId ? { ...p, title, mode, messages, updatedAt: now } : p
          )
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      }

      const id = crypto?.randomUUID?.() ?? String(Date.now());
      setActivePackId(id);

      const newPack = {
        id,
        title,
        mode,
        messages,
        createdAt: now,
        updatedAt: now,
      };

      return [newPack, ...prev].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    });

    showToast(activePackId ? "Saved updates." : "Saved Study Pack.");
  };

  const loadPack = (pack) => {
    cancelInFlight();
    setMessages(ensureMessageIds(pack.messages ?? []));
    setMode(pack.mode ?? MODES[0].id);
    setActivePackId(pack.id);
    setInput("");
    closeSidebar();
    showToast("Loaded pack.");
  };

  const deletePack = (id) => {
    setPacks((prev) => prev.filter((p) => p.id !== id));
    if (activePackId === id) {
      setActivePackId(null);
      setMessages(
        ensureMessageIds([{ role: "assistant", kind: "text", text: "Pack deleted. Start a new one?" }])
      );
    }
    showToast("Deleted.");
  };

  const clearAllPacks = () => {
    setPacks([]);
    setActivePackId(null);
    showToast("Cleared all saved packs.");
  };

  const copyToClipboard = async (text) => {
    if (!text || String(text).trim() === "") {
      showToast("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied!");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = String(text);
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("Copied!");
      } catch {
        showToast("Copy failed.");
      }
    }
  };

  const onAction = (actionName) => {
    showToast(`${actionName} (coming soon)`);
  };

  return (
    <div className="App">
      {/* Backdrop (mobile drawer) */}
      <button
        type="button"
        className={`SidebarBackdrop ${sidebarOpen ? "isOpen" : ""}`}
        aria-label="Close sidebar"
        onClick={closeSidebar}
      />

      {/* Toast */}
      <div className={`toast ${toast ? "toastShow" : ""}`} role="status" aria-live="polite">
        {toast ?? ""}
      </div>

      <aside className={`Sidebar ${sidebarOpen ? "SidebarOpen" : ""}`} aria-label="Sidebar">
        <div className="SidebarInner">
          <div className="upperSidebar">
            <div className="upperSidebarTop">
              <img src={studyLogo} alt="StudyToolsGPT logo" className="logo" />
              <div className="brandBlock">
                <span className="brand">StudyToolsGPT</span>
                <p className="taglineText">Exam prep + study packs</p>
              </div>
            </div>

            <div className="sidebarBtnsRow">
              <button type="button" className="midBtn" onClick={startNewChat} disabled={isSending}>
                <img src={addIcon} alt="" className="addBtn" />
                New Chat
              </button>

              <button
                type="button"
                className="midBtn midBtnSecondary"
                onClick={saveCurrentPack}
              >
                Save
              </button>
            </div>

            <div className="upperSidebarBottom" aria-label="Quick prompts">
              <button
                type="button"
                className="query"
                disabled={isSending}
                onClick={() => quickAsk("Make me a cheat sheet for limits and derivatives.")}
              >
                <img src={msgIcon} alt="" className="OldChatButton" />
                Cheat sheet example
              </button>

              <button
                type="button"
                className="query"
                disabled={isSending}
                onClick={() =>
                  quickAsk("Generate 10 practice problems on modular arithmetic with solutions.")
                }
              >
                <img src={msgIcon} alt="" className="OldChatButton" />
                Practice problems example
              </button>

              <button
                type="button"
                className="query"
                disabled={isSending}
                onClick={() =>
                  quickAsk("Turn my notes on the parts of a plant cell into flashcards.")
                }
              >
                <img src={msgIcon} alt="" className="OldChatButton" />
                Flashcards example
              </button>
            </div>
          </div>

          {/* Saved packs list */}
          <div className="savedSection" aria-label="Saved packs">
            <div className="savedHeaderRow">
              <div className="savedHeaderLeft">
                <img src={saved} alt="" className="listItemsImg" />
                <span className="savedTitle">Saved Packs</span>
              </div>

              <button type="button" className="linkBtn" onClick={clearAllPacks}>
                Clear
              </button>
            </div>

            {packs.length === 0 ? (
              <p className="savedEmpty">
                No saved packs yet. Create one, then hit <span className="kbd">Save</span>.
              </p>
            ) : (
              <div className="savedList">
                {packs.slice(0, 8).map((p) => {
                  const isActive = p.id === activePackId;
                  return (
                    <div key={p.id} className={`savedItem ${isActive ? "savedItemActive" : ""}`}>
                      <button type="button" className="savedOpen" onClick={() => loadPack(p)}>
                        <div className="savedItemTop">
                          <span className="savedItemTitle">{p.title}</span>
                          <span className="savedItemMode">
                            {MODES.find((m) => m.id === p.mode)?.label ?? "Pack"}
                          </span>
                        </div>
                        <div className="savedItemMeta">
                          Updated {new Date(p.updatedAt ?? p.createdAt).toLocaleDateString()}
                        </div>
                      </button>

                      <button
                        type="button"
                        className="iconBtn"
                        aria-label="Delete pack"
                        onClick={() => deletePack(p.id)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <nav className="lowerSidebar" aria-label="Navigation">
            <button type="button" className="navItem" onClick={closeSidebar}>
              <img src={home} alt="" className="listItemsImg" />
              Home
            </button>

            <button
              type="button"
              className="navItem"
              onClick={() => showToast("Share this tool with some of your friends :)")}
            >
              <img src={upgrade} alt="" className="listItemsImg" />
              Consider Sharing
            </button>
          </nav>
        </div>
      </aside>

      <main className="Main">
        {/* Mobile header */}
        <div className="mainHeader">
          <button
            type="button"
            className="hamburger"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <div className="mainHeaderTitle">
            <span className="mainTitle">StudyToolsGPT</span>
            <span className="mainSubtitle">Exam prep + cheat sheets</span>
          </div>

          <button type="button" className="headerBtn" onClick={saveCurrentPack}>
            Save
          </button>
        </div>

        {/* Mode selector */}
        <div className="modeRow" aria-label="Mode selector">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`modePill ${mode === m.id ? "modePillActive" : ""}`}
              onClick={() => setMode(m.id)}
              disabled={isSending}
            >
              {m.label}
            </button>
          ))}
        </div>

        <section className="chats" ref={chatsRef} aria-label="Chat messages">
          {messages.map((m) => {
            const isUser = m.role === "user";
            const isBot = !isUser;

            const hasRenderableBotContent =
              m.kind === "cheatsheet" ? Boolean(m.pack) : Boolean((m.text ?? "").trim());

            return (
              <div key={m.id} className={`messageRow ${isUser ? "isUser" : "isBot"}`}>
                <img
                  className="chatImg"
                  src={isUser ? userIcon : gptImgLogo}
                  alt={isUser ? "User" : "Assistant"}
                />

                <div className={`bubble ${isUser ? "bubbleUser" : "bubbleBot"}`}>
                  {m.kind === "cheatsheet" ? (
                    <CheatSheetCard pack={m.pack} />
                  ) : (
                    <p className="txt">{m.text}</p>
                  )}

                  {isBot && hasRenderableBotContent && (
                    <div className="actionBar" aria-label="Message actions">
                      <button
                        type="button"
                        className="actionBtn"
                        onClick={() => copyToClipboard(messageToCopyText(m))}
                      >
                        Copy
                      </button>
                      <button type="button" className="actionBtn" onClick={() => onAction("Shorten")}>
                        Shorten
                      </button>
                      <button type="button" className="actionBtn" onClick={() => onAction("Add example")}>
                        Add example
                      </button>
                      <button type="button" className="actionBtn" onClick={() => onAction("Regenerate")}>
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <footer className="chatFooter">
          <form className="inp" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Send a message… (${modeLabel})`}
              aria-label="Message input"
              rows={1}
              disabled={isSending}
              aria-disabled={isSending}
            />
            <button
              className="send"
              type="submit"
              aria-label="Send message"
              disabled={isSending}
              aria-disabled={isSending}
            >
              <img src={sendBtn} alt="" />
            </button>
          </form>

          <p className="footerNote">
            StudyToolsGPT may produce inaccurate information about people, places, or facts.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
