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

const MODES = [
  { id: "cheatsheet", label: "Cheat Sheet" },
  { id: "practice", label: "Practice Problems" },
  { id: "flashcards", label: "Flashcards" },
  { id: "explain", label: "Explain Concept" },
  { id: "plan", label: "Study Plan" },
];

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);

    // Handle "null" (or any non-array garbage) safely
    if (!Array.isArray(parsed)) return fallback;

    return parsed;
  } catch {
    return fallback;
  }
}


function shortTitleFromMessages(modeLabel, messages) {
  const firstUser = messages.find((m) => m.role === "user")?.text?.trim();
  if (!firstUser) return `${modeLabel} Pack`;
  const cleaned = firstUser.replace(/\s+/g, " ");
  return cleaned.length > 44 ? cleaned.slice(0, 44) + "…" : cleaned;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [mode, setMode] = useState(MODES[0].id);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "What are you studying today? Pick a mode and paste notes or a topic." },
  ]);

  const [packs, setPacks] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return safeParse(raw, []);
  });
  const [activePackId, setActivePackId] = useState(null);

  const [toast, setToast] = useState(null);

  const chatsRef = useRef(null);
  const textareaRef = useRef(null);

  const modeLabel = useMemo(() => {
    return MODES.find((m) => m.id === mode)?.label ?? "Cheat Sheet";
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
  }, [packs]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const el = chatsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    // Simple textarea autosize
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

  const startNewChat = () => {
    setMessages([{ role: "assistant", text: "New chat started. What topic should we work on?" }]);
    setInput("");
    setActivePackId(null);
    closeSidebar();
  };

  const sendMessage = async (text) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    // 1) Add the user message immediately
    const nextMessages = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setInput("");

    // 2) Add a temporary “thinking…” assistant message
    setMessages((prev) => [...prev, { role: "assistant", text: "Thinking…" }]);

    try {
      const resp = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modeLabel,
          messages: nextMessages.filter((m) => m.role === "user" || m.role === "assistant"),
        }),
      });

      const data = await resp.json();

      if (!resp.ok) throw new Error(data?.error || "Request failed");

      // 3) Replace “Thinking…” with real assistant text
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", text: data.text || "(No response text)" };
        return copy;
      });
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", text: `Error: ${e.message}` };
        return copy;
      });
    }
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
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
    // Don’t save totally empty conversations
    const meaningful = messages.some((m) => m.role === "user" && m.text.trim().length > 0);
    if (!meaningful) {
      showToast("Add a prompt first, then save.");
      return;
    }

    const title = shortTitleFromMessages(modeLabel, messages);
    const now = new Date().toISOString();

    setPacks((prev) => {
      // update existing pack if activePackId exists
      if (activePackId) {
        return prev
          .map((p) =>
            p.id === activePackId
              ? { ...p, title, mode, messages, updatedAt: now }
              : p
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
    setMessages(pack.messages ?? []);
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
      setMessages([{ role: "assistant", text: "Pack deleted. Start a new one?" }]);
    }
    showToast("Deleted.");
  };

  const clearAllPacks = () => {
    setPacks([]);
    setActivePackId(null);
    showToast("Cleared all saved packs.");
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied!");
    } catch {
      // Fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
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
    // Stub actions for now — will call refine endpoints later
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
              <button type="button" className="midBtn" onClick={startNewChat}>
                <img src={addIcon} alt="" className="addBtn" />
                New Chat
              </button>

              <button type="button" className="midBtn midBtnSecondary" onClick={saveCurrentPack}>
                Save
              </button>
            </div>

            <div className="upperSidebarBottom" aria-label="Quick prompts">
              <button type="button" className="query" onClick={() => quickAsk("Make me a cheat sheet for limits and derivatives.")}>
                <img src={msgIcon} alt="" className="OldChatButton" />
                Cheat sheet example
              </button>

              <button type="button" className="query" onClick={() => quickAsk("Generate 10 practice problems on modular arithmetic with solutions.")}>
                <img src={msgIcon} alt="" className="OldChatButton" />
                Practice problems example
              </button>

              <button type="button" className="query" onClick={() => quickAsk("Turn my notes into flashcards. Ask me first what topics I’m weak in.")}>
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
                          <span className="savedItemMode">{MODES.find((m) => m.id === p.mode)?.label ?? "Pack"}</span>
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

            <button type="button" className="navItem" onClick={() => showToast("Sharing (coming soon)")}>
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
            >
              {m.label}
            </button>
          ))}
        </div>

        <section className="chats" ref={chatsRef} aria-label="Chat messages">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            const isBot = !isUser;
            return (
              <div key={idx} className={`messageRow ${isUser ? "isUser" : "isBot"}`}>
                <img
                  className="chatImg"
                  src={isUser ? userIcon : gptImgLogo}
                  alt={isUser ? "User" : "Assistant"}
                />

                <div className={`bubble ${isUser ? "bubbleUser" : "bubbleBot"}`}>
                  <p className="txt">{m.text}</p>

                  {isBot && (
                    <div className="actionBar" aria-label="Message actions">
                      <button type="button" className="actionBtn" onClick={() => copyToClipboard(m.text)}>
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
            />
            <button className="send" type="submit" aria-label="Send message">
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
