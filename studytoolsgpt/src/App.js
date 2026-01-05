import { useEffect, useRef, useState } from "react";
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

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "user", text: "Hello, this is StudyToolsGPT." },
    { role: "assistant", text: "Hey! Send me a topic and I’ll help you study (UI demo for now)." },
  ]);

  const chatsRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const el = chatsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    // Simple textarea autosize (keeps UI feeling nice)
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(160, ta.scrollHeight) + "px";
  }, [input]);

  const closeSidebar = () => setSidebarOpen(false);

  const startNewChat = () => {
    setMessages([
      { role: "assistant", text: "New chat started. What are you studying today?" },
    ]);
    setInput("");
    closeSidebar();
  };

  const sendMessage = (text) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text:
          "Got it — once the API is wired, I’ll generate a cheat sheet / study plan from your prompt. For now, this is a UI-only placeholder response.",
      },
    ]);

    setInput("");
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

  return (
    <div className="App">
      {/* Backdrop (mobile drawer) */}
      <button
        type="button"
        className={`SidebarBackdrop ${sidebarOpen ? "isOpen" : ""}`}
        aria-label="Close sidebar"
        onClick={closeSidebar}
      />

      <aside className={`Sidebar ${sidebarOpen ? "SidebarOpen" : ""}`} aria-label="Sidebar">
        <div className="SidebarInner">
          <div className="upperSidebar">
            <div className="upperSidebarTop">
              <img src={studyLogo} alt="StudyToolsGPT logo" className="logo" />
              <div className="brandBlock">
                <span className="brand">StudyToolsGPT</span>
                <p className="taglineText">Your AI Study Tool — Adithya Ganesh</p>
              </div>
            </div>

            <button type="button" className="midBtn" onClick={startNewChat}>
              <img src={addIcon} alt="" className="addBtn" />
              New Chat
            </button>

            <div className="upperSidebarBottom" aria-label="Quick prompts">
              <button
                type="button"
                className="query"
                onClick={() => quickAsk("What is StudyToolsGPT?")}
              >
                <img src={msgIcon} alt="" className="OldChatButton" />
                What is StudyToolsGPT?
              </button>

              <button
                type="button"
                className="query"
                onClick={() => quickAsk("How do I use StudyToolsGPT effectively for exam prep?")}
              >
                <img src={msgIcon} alt="" className="OldChatButton" />
                How to use StudyToolsGPT?
              </button>

              <button
                type="button"
                className="query"
                onClick={() => quickAsk("What are the newest features you plan to add?")}
              >
                <img src={msgIcon} alt="" className="OldChatButton" />
                Newest Features
              </button>
            </div>
          </div>

          <nav className="lowerSidebar" aria-label="Navigation">
            <button type="button" className="navItem" onClick={closeSidebar}>
              <img src={home} alt="" className="listItemsImg" />
              Home
            </button>

            <button type="button" className="navItem" onClick={closeSidebar}>
              <img src={saved} alt="" className="listItemsImg" />
              Saved
            </button>

            <button type="button" className="navItem" onClick={closeSidebar}>
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
        </div>

        <section className="chats" ref={chatsRef} aria-label="Chat messages">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className={`messageRow ${isUser ? "isUser" : "isBot"}`}>
                <img
                  className="chatImg"
                  src={isUser ? userIcon : gptImgLogo}
                  alt={isUser ? "User" : "Assistant"}
                />
                <div className={`bubble ${isUser ? "bubbleUser" : "bubbleBot"}`}>
                  <p className="txt">{m.text}</p>
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
              placeholder="Send a message (Enter to send, Shift+Enter for newline)"
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
