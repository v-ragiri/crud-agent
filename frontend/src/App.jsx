import React, { useState, useRef, useEffect } from "react";
import CutGroup from "./CutGroup";
import { autoCreateTabsFromTags, readCutsandTagsFromDOM, deleteTab, updateStats } from "./utils/helpers";

const SUGGESTIONS = [
  "Show me all my tabs",
  "Create tabs from tags",
];

// ── Client-side tool implementations ─────────────────────────────────────────
// These run locally in the browser. The server pauses the agent loop and asks
// the client to execute these, then resumes with the result via /api/agent/resume.

function executeClientTool(toolName, args, tabsRef) {

  if (toolName === "read_tabs") {
    const tabs = tabsRef.current || [];
    const filterTab = (args.filter_tab_name || "").toLowerCase();
    const filterCut = (args.filter_cut_name || "").toLowerCase();

    let result = tabs;
    if (filterTab) {
      result = result.filter(t => t.name.toLowerCase().includes(filterTab));
    }
    result = result.map(t => ({
      ...t,
      cuts: filterCut
        ? (t.cuts || []).filter(c => c.name.toLowerCase().includes(filterCut))
        : (t.cuts || []),
    }));
    return { success: true, tab_count: result.length, tabs: result };
  }

  if (toolName === "auto_create_tabs_from_tags") {
    const { max_tab_name_length = 10 } = args;

    // Read cuts and tags fresh from the DOM — args no longer carries them
    // since the tool schema was simplified to not require user-provided data.
    const cuts = [];
    const tags = [];
    readCutsandTagsFromDOM(cuts, tags);

    // Use currently tracked tabs to avoid duplicate names
    const existingNames = {};
    (tabsRef.current || []).forEach(t => {
      existingNames[t.name.toLowerCase()] = true;
    });

    function uniqueName(base) {
      const truncated = base.trim().slice(0, max_tab_name_length) || "Sheet";
      if (!existingNames[truncated.toLowerCase()]) {
        existingNames[truncated.toLowerCase()] = true;
        return truncated;
      }
      for (let v = 2; v < 100; v++) {
        const candidate = `${truncated.slice(0, max_tab_name_length - 3)}_v${v}`.slice(0, max_tab_name_length);
        if (!existingNames[candidate.toLowerCase()]) {
          existingNames[candidate.toLowerCase()] = true;
          return candidate;
        }
      }
      return truncated;
    }

    const created = [];
    for (const tag of tags) {
      if (!tag.name) continue;
      const cutIds = new Set(tag.cut_ids || []);
      const matching = cuts.filter(c => cutIds.has(c.id));
      created.push({ name: uniqueName(tag.name), cuts: matching });
    }

    const untagged = cuts.filter(c => !c.tag);
    if (untagged.length) {
      created.push({ name: uniqueName("Untagged"), cuts: untagged });
    }

    // Persist tabs into the ref (for fast sync reads by other client tools)
    // and into state (so CutGroup re-renders with the new tabs)
    const updatedTabs = [...(tabsRef.current || []), ...created];
    autoCreateTabsFromTags(null, tags, cuts, tabsRef.current, created);  // re-render CutGroup with fresh data
    tabsRef.current = updatedTabs;
    return { success: true, created_count: created.length, tabs: created };
  }

  if (toolName === "remove_tab") {
    const currentTabs = tabsRef.current || [];
    const targetName = (args.tab_name || args.name || "").toLowerCase().trim();

    if (!targetName) {
      return { success: false, error: "Missing tab_name (or name) for remove_tab" };
    }

    const removed = currentTabs.filter(t => (t.name || "").toLowerCase().trim() === targetName);
    const remaining = currentTabs.filter(t => (t.name || "").toLowerCase().trim() !== targetName);
    const indexRemoved = currentTabs.findIndex(t => (t.name || "").toLowerCase().trim() === targetName);

    if (removed.length === 0) {
      return { success: false, error: `No tab found with name "${args.tab_name || args.name}"` };
    }
    deleteTab(`tab_${indexRemoved+1}`);  // remove from DOM
    tabsRef.current = remaining;
    return {
      success: true,
      removed_count: removed.length,
      removed_tabs: removed,
      tab_count: remaining.length,
      tabs: remaining,
    };
  }

  if (toolName === "remove_all_tabs") {
    const currentTabs = tabsRef.current || [];
    const removedCount = currentTabs.length;
    tabsRef.current = [];
    const cuts = [];
    const tags = [];
    readCutsandTagsFromDOM(cuts, tags);
    autoCreateTabsFromTags(null, tags, cuts, [], tabsRef.current);  // re-render CutGroup with fresh data after deletion
    return {
      success: true,
      removed_count: removedCount,
      tab_count: 0,
      tabs: [],
    };
  }

  if (toolName === "move_cut_between_tabs") {
    const singleCutNameRaw = (args.cut_name || "").trim();
    const multiCutNamesRaw = Array.isArray(args.cut_names)
      ? args.cut_names.map(n => String(n || "").trim()).filter(Boolean)
      : [];
    const sourceTabRaw = (args.source_tab || "").trim();
    const targetTabRaw = (args.target_tab || "").trim();

    const requestedCutNamesRaw = multiCutNamesRaw.length > 0
      ? multiCutNamesRaw
      : (singleCutNameRaw ? [singleCutNameRaw] : []);

    if (!sourceTabRaw || !targetTabRaw || requestedCutNamesRaw.length === 0) {
      return {
        success: false,
        error: "Missing required fields: source_tab, target_tab, and cut_name or cut_names",
      };
    }

    const requestedCutNames = requestedCutNamesRaw.map(name => name.toLowerCase());
    const sourceTab = sourceTabRaw.toLowerCase();
    const targetTab = targetTabRaw.toLowerCase();

    if (sourceTab === targetTab) {
      return {
        success: false,
        error: "source_tab and target_tab must be different",
      };
    }

    const currentTabs = tabsRef.current || [];
    const sourceIndex = currentTabs.findIndex(t => (t.name || "").trim().toLowerCase() === sourceTab);
    const targetIndex = currentTabs.findIndex(t => (t.name || "").trim().toLowerCase() === targetTab);

    if (sourceIndex === -1) {
      return { success: false, error: `Source tab not found: ${sourceTabRaw}` };
    }
    if (targetIndex === -1) {
      return { success: false, error: `Target tab not found: ${targetTabRaw}` };
    }

    const sourceCuts = currentTabs[sourceIndex].cuts || [];
    const sourceCutsByName = new Map();
    sourceCuts.forEach(c => {
      const key = (c.name || "").trim().toLowerCase();
      if (!sourceCutsByName.has(key)) {
        sourceCutsByName.set(key, []);
      }
      sourceCutsByName.get(key).push(c);
    });

    const missingCuts = requestedCutNamesRaw.filter((rawName, idx) => {
      const lowered = requestedCutNames[idx];
      return !sourceCutsByName.has(lowered) || sourceCutsByName.get(lowered).length === 0;
    });

    if (missingCuts.length > 0) {
      return {
        success: false,
        error: `Cuts not found in source tab \"${currentTabs[sourceIndex].name}\": ${missingCuts.join(", ")}`,
      };
    }

    const movedCuts = [];
    requestedCutNames.forEach(name => {
      const bucket = sourceCutsByName.get(name);
      if (bucket && bucket.length > 0) {
        movedCuts.push(bucket.shift());
      }
    });

    const updatedTabs = currentTabs.map(tab => ({ ...tab, cuts: [...(tab.cuts || [])] }));
    const movedCutIds = new Set(movedCuts.map(c => c.id));
    updatedTabs[sourceIndex].cuts = updatedTabs[sourceIndex].cuts.filter(c => !movedCutIds.has(c.id));
    updatedTabs[targetIndex].cuts.push(...movedCuts);

    const sourceTabId = `tab_${sourceIndex + 1}`;
    const targetTabId = `tab_${targetIndex + 1}`;
    const sourceDropzone = document.getElementById(`dropzone_${sourceTabId}`);
    const targetDropzone = document.getElementById(`dropzone_${targetTabId}`);

    if (!sourceDropzone || !targetDropzone) {
      return {
        success: false,
        error: "Could not locate one or both tab drop zones in the DOM",
      };
    }

    const movedElements = [];
    movedCuts.forEach(cut => {
      const cutElement = Array.from(sourceDropzone.querySelectorAll(".tab-cut-item")).find(el => {
        const idAttr = (el.getAttribute("data-cut-id") || "").trim();
        return idAttr === cut.id;
      });
      if (cutElement) {
        movedElements.push(cutElement);
      }
    });

    if (movedElements.length !== movedCuts.length) {
      return {
        success: false,
        error: "Could not locate one or more requested cuts in source tab DOM",
      };
    }

    targetDropzone.classList.remove("empty-state");
    const targetPlaceholder = targetDropzone.querySelector(".placeholder-text");
    if (targetPlaceholder) {
      targetPlaceholder.remove();
    }

    movedElements.forEach(el => {
      el.remove();
      targetDropzone.appendChild(el);
    });

    if (!sourceDropzone.querySelector(".tab-cut-item")) {
      sourceDropzone.classList.add("empty-state");
      sourceDropzone.innerHTML = '<span class="placeholder-text">Drop cuts here</span>';
    }

    tabsRef.current = updatedTabs;
    updateStats();

    return {
      success: true,
      moved_count: movedCuts.length,
      moved_cuts: movedCuts,
      source_tab: updatedTabs[sourceIndex].name,
      target_tab: updatedTabs[targetIndex].name,
      source_cut_count: updatedTabs[sourceIndex].cuts.length,
      target_cut_count: updatedTabs[targetIndex].cuts.length,
      tabs: updatedTabs,
    };
  }

  return { success: false, error: `Unknown client tool: ${toolName}` };
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState([]);
  const [display, setDisplay] = useState([
    { role: "agent", text: "Hi! I manage users, products, and tabs. Some operations run locally in your browser — try asking me to create tabs or list them." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);


  // In-browser tab state — client-side tools read/write this directly
  const tabsRef = useRef([{
        name: "Sheet 1",
        cuts: [
            { "id": "cut_1", "name": "Q4_ How many students are enrolled in the school y...", "tag": "SS" },
        ]

    }]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [display]);

  // POST to /api/agent (start) or /api/agent/resume (after client tool)
  async function callAPI(endpoint, body) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // Handle one full agent turn, including any client-tool pause/resume cycles.
  // Returns the final resolved messages array so send() can write it to state
  // in one shot — avoiding any stale-closure issues with setMessages timing.
  async function runAgent(initialMessages) {
    let data = await callAPI("http://127.0.0.1:8000/api/agent", { messages: initialMessages });
 
    // Keep history in a local variable — never read from messages state here.
    // setMessages is only called once, at the end, from send().
    let latestMessages = data.messages;
 
    while (data.pending_tool_call) {
      const { id, name, args } = data.pending_tool_call;

      setDisplay(d => [...d, { role: "tool", text: `Running locally: ${name}` }]);

      // executeClientTool handles all DOM reads and tabsRef writes internally.
      // Do NOT call readCutsandTagsFromDOM or autoCreateTabsFromTags here —
      // doing so overwrites tabsRef.current with stale data causing the 1-command delay.
      const result = executeClientTool(name, args, tabsRef);
      // Sync snapshot state so CutGroup re-renders after every tool execution

      data = await callAPI("http://127.0.0.1:8000/api/agent/resume", {
        tool_call_id: id,
        tool_name: name,
        result,
        messages: latestMessages,   // always use the local var, not state
      });
 
      latestMessages = data.messages;  // update local var after each resume
    }
 
    return { reply: data.reply, messages: latestMessages };
  }
 
  async function send(text) {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);
    setDisplay(d => [...d, { role: "user", text }]);
 
    // Snapshot messages into a local var — runAgent never touches state directly
    const nextMessages = [...messages, { role: "user", content: text }];
 
    try {
      const { reply, messages: finalMessages } = await runAgent(nextMessages);
      // Single state write at the very end — no async timing ambiguity
      setMessages(finalMessages);
      setDisplay(d => [...d, { role: "agent", text: reply }]);
    } catch (e) {
      setDisplay(d => [...d, { role: "error", text: "Error: " + e.message }]);
    } finally {
      setLoading(false);
    }
  }

  const msgColor = {
    user: { bg: "#2563eb", color: "#fff" },
    agent: { bg: "#f3f4f6", color: "#111" },
    tool: { bg: "#f0fdf4", color: "#166534" },
    error: { bg: "#fee2e2", color: "#991b1b" },
  };

  return (
    <React.Fragment>
    <div style={{
      maxWidth: 680, background: "whitesmoke", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif", position: "absolute",
      right: 0,
      bottom: 0,
      zIndex: 1000,
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>CRUD Agent</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        Powered by Gemini + FastAPI · Tab tools run client-side
      </p>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div style={{ height: 420, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {display.map((msg, i) => {
            const isUser = msg.role === "user";
            const style = msgColor[msg.role] || msgColor.agent;
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%", padding: "8px 12px", borderRadius: 12,
                  fontSize: msg.role === "tool" ? 12 : 14, lineHeight: 1.55,
                  fontStyle: msg.role === "tool" ? "italic" : "normal",
                  background: style.bg, color: style.color,
                  borderTopRightRadius: isUser ? 4 : 12,
                  borderTopLeftRadius: msg.role === "agent" ? 4 : 12,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: "flex" }}>
              <div style={{ background: "#f3f4f6", borderRadius: 12, borderTopLeftRadius: 4, padding: "10px 14px" }}>
                <span style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                      animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s`,
                      display: "inline-block",
                    }} />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "8px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)} disabled={loading} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              border: "1px solid #e5e7eb", background: "#f9fafb",
              cursor: "pointer", color: "#555", whiteSpace: "nowrap",
            }}>
              {s.length > 32 ? s.slice(0, 32) + "…" : s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, padding: "10px 16px 14px", borderTop: "1px solid #f3f4f6" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
            placeholder="e.g. Show me all tabs..."
            disabled={loading}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: "1px solid #d1d5db", fontSize: 14,
              outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{
            padding: "8px 18px", borderRadius: 8, border: "1px solid #d1d5db",
            background: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
          }}>
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