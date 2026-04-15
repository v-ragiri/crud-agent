import React, { useState, useRef, useEffect } from "react";
import CutGroup from "./CutGroup";

const SUGGESTIONS = [
  "Add a user named Alice, email alice@acme.com, role Admin",
  "Add a product called Pro Plan, price 49, category Software",
  "List all users",
  "List all products",
  "Update Alice's role to Manager",
];

export default function App() {
  const [messages, setMessages] = useState([]); // conversation history sent to API
  const [display, setDisplay] = useState([
    // what's shown in the chat UI
    {
      role: "agent",
      text: "Hi! I can create, read, update, and delete users and products. Try a suggestion below or type your own.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [display]);

  async function send(text) {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];

    setDisplay((d) => [...d, { role: "user", text }]);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(data.messages);
      setDisplay((d) => [...d, { role: "agent", text: data.reply }]);
    } catch (e) {
      setDisplay((d) => [...d, { role: "error", text: "Error: " + e.message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <React.Fragment>
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "2rem 1rem",
        fontFamily: "system-ui, sans-serif",
        position: "absolute",
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
        CRUD Agent
      </h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        Powered by Gemini + FastAPI + In-memory DB. Try the suggestions or type
        your own commands to manage users and products.
      </p>

      {/* Chat window */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            height: 420,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {display.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.55,
                  background:
                    msg.role === "user"
                      ? "#2563eb"
                      : msg.role === "error"
                      ? "#fee2e2"
                      : "#f3f4f6",
                  color:
                    msg.role === "user"
                      ? "#fff"
                      : msg.role === "error"
                      ? "#991b1b"
                      : "#111",
                  borderTopRightRadius: msg.role === "user" ? 4 : 12,
                  borderTopLeftRadius: msg.role === "agent" ? 4 : 12,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex" }}>
              <div
                style={{
                  background: "#f3f4f6",
                  borderRadius: 12,
                  borderTopLeftRadius: 4,
                  padding: "10px 14px",
                }}
              >
                <span style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#9ca3af",
                        animation: "bounce 1.2s infinite",
                        animationDelay: `${i * 0.2}s`,
                        display: "inline-block",
                      }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => send(s)}
              disabled={loading}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 20,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                cursor: "pointer",
                color: "#555",
                whiteSpace: "nowrap",
              }}
            >
              {s.length > 32 ? s.slice(0, 32) + "…" : s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 16px 14px",
            borderTop: "1px solid #f3f4f6",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="e.g. Delete user #3..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>
    </div>
    <CutGroup />
    </React.Fragment>
  );
}
