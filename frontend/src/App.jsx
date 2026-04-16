import React, { useState, useRef, useEffect } from "react";
import CutGroup from "./CutGroup";
import {
  autoCreateTabsFromTags,
  readCutsandTagsFromDOM,
  deleteTab,
  updateStats,
} from "./utils/helpers";

const SUGGESTIONS = ["Show me all my tabs", "Create tabs from tags"];

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
      result = result.filter((t) => t.name.toLowerCase().includes(filterTab));
    }
    result = result.map((t) => ({
      ...t,
      cuts: filterCut
        ? (t.cuts || []).filter((c) => c.name.toLowerCase().includes(filterCut))
        : t.cuts || [],
    }));
    return { success: true, tab_count: result.length, tabs: result };
  }

  if (toolName === "auto_create_tabs_from_tags") {
    const { max_tab_name_length = 30 } = args;

    // Normalise the optional tag_names filter to a lowercase set (empty = all tags)
    const requestedTagNames =
      Array.isArray(args.tag_names) && args.tag_names.length > 0
        ? new Set(args.tag_names.map((n) => String(n || "").trim().toLowerCase()).filter(Boolean))
        : null; // null means "all tags"

    // include_untagged defaults to true when no filter is applied, false otherwise
    const includeUntagged =
      typeof args.include_untagged === "boolean"
        ? args.include_untagged
        : requestedTagNames === null; // default: true for all-tags, false for filtered

    // Read cuts and tags fresh from the DOM
    const cuts = [];
    const tags = [];
    readCutsandTagsFromDOM(cuts, tags);

    // Validate requested tag names against what actually exists in the DOM
    if (requestedTagNames !== null) {
      const availableTagNames = new Set(tags.map((t) => (t.name || "").trim().toLowerCase()));
      const notFound = [...requestedTagNames].filter((n) => !availableTagNames.has(n));
      if (notFound.length > 0) {
        return {
          success: false,
          error: `Tag(s) not found: ${notFound.join(", ")}. Available tags: ${[...availableTagNames].join(", ")}`,
        };
      }
    }

    // Use currently tracked tabs to avoid duplicate names
    const existingNames = {};
    (tabsRef.current || []).forEach((t) => {
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

    // Filter tags: use all tags, or only the requested subset
    const tagsToCreate =
      requestedTagNames === null
        ? tags.filter((t) => t.name)
        : tags.filter((t) => t.name && requestedTagNames.has(t.name.trim().toLowerCase()));

    const created = [];
    for (const tag of tagsToCreate) {
      const cutIds = new Set(tag.cut_ids || []);
      const matching = cuts.filter((c) => cutIds.has(c.id));
      created.push({ name: uniqueName(tag.name), cuts: matching });
    }

    if (includeUntagged) {
      const untagged = cuts.filter((c) => !c.tag);
      if (untagged.length) {
        created.push({ name: uniqueName("Untagged"), cuts: untagged });
      }
    }

    // Persist into ref and re-render CutGroup
    const updatedTabs = [...(tabsRef.current || []), ...created];
    autoCreateTabsFromTags(null, tags, cuts, tabsRef.current, created);
    tabsRef.current = updatedTabs;
    return { success: true, created_count: created.length, tabs: created };
  }

  if (toolName === "remove_tab") {
    const currentTabs = tabsRef.current || [];
    const targetName = (args.tab_name || args.name || "").toLowerCase().trim();

    if (!targetName) {
      return {
        success: false,
        error: "Missing tab_name (or name) for remove_tab",
      };
    }

    const removed = currentTabs.filter(
      (t) => (t.name || "").toLowerCase().trim() === targetName
    );
    const remaining = currentTabs.filter(
      (t) => (t.name || "").toLowerCase().trim() !== targetName
    );

    if (removed.length === 0) {
      return {
        success: false,
        error: `No tab found with name "${args.tab_name || args.name}"`,
      };
    }

    // Look up the actual data-tab-id from the DOM by matching the tab name
    // input value — avoids stale index-based IDs after prior deletions.
    const tabColumns = document.querySelectorAll(".tab-column");
    let domTabId = null;
    for (const col of tabColumns) {
      const input = col.querySelector(".tab-name-input");
      if (input && input.value.trim().toLowerCase() === targetName) {
        domTabId = col.getAttribute("data-tab-id");
        break;
      }
    }

    if (!domTabId) {
      return {
        success: false,
        error: `Tab "${args.tab_name || args.name}" not found in DOM`,
      };
    }

    deleteTab(domTabId);
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
    autoCreateTabsFromTags(null, tags, cuts, [], tabsRef.current); // re-render CutGroup with fresh data after deletion
    return {
      success: true,
      removed_count: removedCount,
      tab_count: 0,
      tabs: [],
    };
  }

  if (toolName === "group_cuts_by_question_type") {
    const cuts = [];
    const tags = [];
    readCutsandTagsFromDOM(cuts, tags);

    if (cuts.length === 0) {
      return {
        success: true,
        grouped_count: 0,
        groups: [],
        message: "No cuts found to group.",
      };
    }

    // Helper to classify question type based on keywords in the text
    function classifyQuestionType(text) {
      const lower = (text || "").toLowerCase();
      if (/\bhow many\b|\bcount\b|\bnumber of\b/.test(lower)) return "Count/Quantity";
      if (/\bwhich of\b|\bchoose\b|\bselect\b/.test(lower)) return "Multiple Choice";
      if (/\bscale\b|\blikelihood\b|\brate\b|\bfrom.*to\b/.test(lower)) return "Scale/Rating";
      if (/\byou indicated\b|\byou are\b|\bif.*then\b|\binvolved in\b/.test(lower))
        return "Conditional/Behavioral";
      if (/\bdescribe\b|\bhow well\b|\bperform\b/.test(lower)) return "Performance/Descriptive";
      if (/\bwhat\b|\bwhen\b|\bwhere\b|\bwhy\b/.test(lower)) return "Open-ended";
      return "Other";
    }

    // Group cuts by question type
    const groupMap = {};
    cuts.forEach((cut) => {
      const qType = classifyQuestionType(cut.name);
      if (!groupMap[qType]) {
        groupMap[qType] = { groupName: qType, cuts: [] };
      }
      groupMap[qType].cuts.push(cut);
    });

    // Convert to array and add metadata
    const groups = Object.values(groupMap).map((g) => ({
      ...g,
      cut_count: g.cuts.length,
      groupDescription: `Contains ${g.cuts.length} question(s) of type: ${g.groupName}`,
    }));

    // Sort by group name for consistency
    groups.sort((a, b) => a.groupName.localeCompare(b.groupName));

    return {
      success: true,
      grouped_count: groups.length,
      total_cuts: cuts.length,
      groups: groups,
      message: `Identified ${groups.length} groups from ${cuts.length} cuts. User can now create tabs for each group.`,
    };
  }

  if (toolName === "create_tabs_from_groups") {
    const cuts = [];
    const tags = [];
    readCutsandTagsFromDOM(cuts, tags);

    if (cuts.length === 0) {
      return {
        success: false,
        error: "No cuts found to group.",
      };
    }

    // Helper to classify question type (same logic as group_cuts_by_question_type)
    function classifyQuestionType(text) {
      const lower = (text || "").toLowerCase();
      if (/\bhow many\b|\bcount\b|\bnumber of\b/.test(lower)) return "Count/Quantity";
      if (/\bwhich of\b|\bchoose\b|\bselect\b/.test(lower)) return "Multiple Choice";
      if (/\bscale\b|\blikelihood\b|\brate\b|\bfrom.*to\b/.test(lower)) return "Scale/Rating";
      if (/\byou indicated\b|\byou are\b|\bif.*then\b|\binvolved in\b/.test(lower))
        return "Conditional/Behavioral";
      if (/\bdescribe\b|\bhow well\b|\bperform\b/.test(lower)) return "Performance/Descriptive";
      if (/\bwhat\b|\bwhen\b|\bwhere\b|\bwhy\b/.test(lower)) return "Open-ended";
      return "Other";
    }

    // Group cuts by question type
    const groupMap = {};
    cuts.forEach((cut) => {
      const qType = classifyQuestionType(cut.name);
      if (!groupMap[qType]) {
        groupMap[qType] = { groupName: qType, cuts: [] };
      }
      groupMap[qType].cuts.push(cut);
    });

    // Convert to array and sort for consistency
    const groups = Object.values(groupMap).sort((a, b) =>
      a.groupName.localeCompare(b.groupName)
    );

    // Apply custom tab names if provided
    const tabNameMapping = args.tab_names || {};
    const autoName = typeof args.auto_name === "boolean" ? args.auto_name : true;

    // Track existing tab names to avoid duplicates
    const existingNames = {};
    (tabsRef.current || []).forEach((t) => {
      existingNames[t.name.toLowerCase()] = true;
    });

    function getUniqueName(baseName) {
      const lower = baseName.toLowerCase();
      if (!existingNames[lower]) {
        existingNames[lower] = true;
        return baseName;
      }
      for (let v = 2; v < 100; v++) {
        const candidate = `${baseName}_v${v}`;
        if (!existingNames[candidate.toLowerCase()]) {
          existingNames[candidate.toLowerCase()] = true;
          return candidate;
        }
      }
      return baseName;
    }

    // Create tabs for each group
    const created = [];
    for (const group of groups) {
      let tabName;
      if (autoName) {
        // Use custom name if provided, otherwise use group name
        tabName = tabNameMapping[group.groupName] || group.groupName;
      } else {
        tabName = tabNameMapping[group.groupName];
        if (!tabName) {
          return {
            success: false,
            error: `Custom tab name not provided for group "${group.groupName}". Pass tab_names mapping or set auto_name=true.`,
          };
        }
      }

      tabName = getUniqueName(tabName);
      created.push({
        name: tabName,
        cuts: group.cuts,
      });
    }

    // Persist into ref and render
    const updatedTabs = [...(tabsRef.current || []), ...created];
    autoCreateTabsFromTags(null, tags, cuts, tabsRef.current, created);
    tabsRef.current = updatedTabs;

    return {
      success: true,
      created_count: created.length,
      tabs: created.map((t) => ({
        name: t.name,
        cut_count: t.cuts.length,
      })),
      message: `Created ${created.length} tabs from ${groups.length} groups.`,
    };
  }

  if (toolName === "move_cut_between_tabs") {
    const singleCutNameRaw = (args.cut_name || "").trim();
    const multiCutNamesRaw = Array.isArray(args.cut_names)
      ? args.cut_names.map((n) => String(n || "").trim()).filter(Boolean)
      : [];
    const moveAllCuts = args.move_all_cuts === true;
    const sourceTabRaw = (args.source_tab || "").trim();
    const targetTabRaw = (args.target_tab || "").trim();

    const requestedCutNamesRaw =
      multiCutNamesRaw.length > 0
        ? multiCutNamesRaw
        : singleCutNameRaw
        ? [singleCutNameRaw]
        : [];

    if (!sourceTabRaw || !targetTabRaw || (!moveAllCuts && requestedCutNamesRaw.length === 0)) {
      return {
        success: false,
        error:
          "Missing required fields: source_tab, target_tab, and cut_name/cut_names (or set move_all_cuts=true)",
      };
    }

    const requestedCutNames = requestedCutNamesRaw.map((name) => name.toLowerCase());
    const sourceTab = sourceTabRaw.toLowerCase();
    const targetTab = targetTabRaw.toLowerCase();

    if (sourceTab === targetTab) {
      return {
        success: false,
        error: "source_tab and target_tab must be different",
      };
    }

    const currentTabs = tabsRef.current || [];
    const sourceIndex = currentTabs.findIndex(
      (t) => (t.name || "").trim().toLowerCase() === sourceTab
    );
    const targetIndex = currentTabs.findIndex(
      (t) => (t.name || "").trim().toLowerCase() === targetTab
    );

    if (sourceIndex === -1) {
      return { success: false, error: `Source tab not found: ${sourceTabRaw}` };
    }
    if (targetIndex === -1) {
      return { success: false, error: `Target tab not found: ${targetTabRaw}` };
    }

    const sourceCuts = currentTabs[sourceIndex].cuts || [];
    let movedCuts = [];

    if (moveAllCuts) {
      movedCuts = [...sourceCuts];
    } else {
      const sourceCutsByName = new Map();
      sourceCuts.forEach((c) => {
        const key = (c.name || "").trim().toLowerCase();
        if (!sourceCutsByName.has(key)) {
          sourceCutsByName.set(key, []);
        }
        sourceCutsByName.get(key).push(c);
      });

      const missingCuts = requestedCutNamesRaw.filter((rawName, idx) => {
        const lowered = requestedCutNames[idx];
        return (
          !sourceCutsByName.has(lowered) ||
          sourceCutsByName.get(lowered).length === 0
        );
      });

      if (missingCuts.length > 0) {
        return {
          success: false,
          error: `Cuts not found in source tab "${
            currentTabs[sourceIndex].name
          }": ${missingCuts.join(", ")}`,
        };
      }

      requestedCutNames.forEach((name) => {
        const bucket = sourceCutsByName.get(name);
        if (bucket && bucket.length > 0) {
          movedCuts.push(bucket.shift());
        }
      });
    }

    if (movedCuts.length === 0) {
      return {
        success: true,
        moved_count: 0,
        moved_cuts: [],
        source_tab: currentTabs[sourceIndex].name,
        target_tab: currentTabs[targetIndex].name,
        source_cut_count: currentTabs[sourceIndex].cuts.length,
        target_cut_count: currentTabs[targetIndex].cuts.length,
        tabs: currentTabs,
      };
    }

    // Resolve actual DOM tab-ids by name — array indices are unreliable after deletions
    const allTabColumns = document.querySelectorAll(".tab-column");
    let sourceTabDomId = null;
    let targetTabDomId = null;
    for (const col of allTabColumns) {
      const input = col.querySelector(".tab-name-input");
      if (!input) continue;
      const colName = input.value.trim().toLowerCase();
      if (colName === sourceTab) sourceTabDomId = col.getAttribute("data-tab-id");
      if (colName === targetTab) targetTabDomId = col.getAttribute("data-tab-id");
    }

    if (!sourceTabDomId) {
      return { success: false, error: `Source tab "${sourceTabRaw}" not found in DOM` };
    }
    if (!targetTabDomId) {
      return { success: false, error: `Target tab "${targetTabRaw}" not found in DOM` };
    }

    const sourceDropzone = document.getElementById(`dropzone_${sourceTabDomId}`);
    const targetDropzone = document.getElementById(`dropzone_${targetTabDomId}`);

    if (!sourceDropzone || !targetDropzone) {
      return {
        success: false,
        error: "Could not locate one or both tab drop zones in the DOM",
      };
    }

    // Collect all matching DOM elements from the source dropzone up front,
    // before any mutations, so that removals don't affect subsequent lookups.
    const allSourceItems = Array.from(sourceDropzone.querySelectorAll(".tab-cut-item"));
    const movedElements = [];
    const domMissingCuts = [];
    movedCuts.forEach((cut) => {
      const el = allSourceItems.find(
        (item) => (item.getAttribute("data-cut-id") || "").trim() === cut.id
      );
      if (el) {
        movedElements.push(el);
      } else {
        domMissingCuts.push(cut.name);
      }
    });

    if (domMissingCuts.length > 0) {
      return {
        success: false,
        error: `Could not locate in source tab DOM: ${domMissingCuts.join(", ")}`,
      };
    }

    // Prepare target dropzone
    targetDropzone.classList.remove("empty-state");
    const targetPlaceholder = targetDropzone.querySelector(".placeholder-text");
    if (targetPlaceholder) {
      targetPlaceholder.remove();
    }

    // Move elements: detach from source, append to target
    movedElements.forEach((el) => {
      el.remove();
      targetDropzone.appendChild(el);
    });

    // Restore empty-state on source if it has no cuts left
    if (!sourceDropzone.querySelector(".tab-cut-item")) {
      sourceDropzone.classList.add("empty-state");
      sourceDropzone.innerHTML =
        '<span class="placeholder-text">Drop cuts here</span>';
    }

    // Update in-memory state after DOM mutations succeeded
    const updatedTabs = currentTabs.map((tab) => ({
      ...tab,
      cuts: [...(tab.cuts || [])],
    }));
    const movedCutIds = new Set(movedCuts.map((c) => c.id));
    updatedTabs[sourceIndex].cuts = updatedTabs[sourceIndex].cuts.filter(
      (c) => !movedCutIds.has(c.id)
    );
    updatedTabs[targetIndex].cuts.push(...movedCuts);

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
    {
      role: "agent",
      text: "Hi! I manage users, products, and tabs. Some operations run locally in your browser — try asking me to create tabs or list them.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef(null);

  // In-browser tab state — client-side tools read/write this directly
  const tabsRef = useRef([
    {
      name: "Sheet 1",
      cuts: [
        {
          id: "cut_1",
          name: "Q4_ How many students are enrolled in the school y...",
          tag: "SS",
        },
      ],
    },
  ]);

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
    let data = await callAPI("http://127.0.0.1:8000/api/agent", {
      messages: initialMessages,
    });

    // Keep history in a local variable — never read from messages state here.
    // setMessages is only called once, at the end, from send().
    let latestMessages = data.messages;

    while (data.pending_tool_call) {
      const { id, name, args } = data.pending_tool_call;

      setDisplay((d) => [
        ...d,
        { role: "tool", text: `Running locally: ${name}` },
      ]);

      // executeClientTool handles all DOM reads and tabsRef writes internally.
      // Do NOT call readCutsandTagsFromDOM or autoCreateTabsFromTags here —
      // doing so overwrites tabsRef.current with stale data causing the 1-command delay.
      const result = executeClientTool(name, args, tabsRef);
      // Sync snapshot state so CutGroup re-renders after every tool execution

      data = await callAPI("http://127.0.0.1:8000/api/agent/resume", {
        tool_call_id: id,
        tool_name: name,
        result,
        messages: latestMessages, // always use the local var, not state
      });

      latestMessages = data.messages; // update local var after each resume
    }

    return { reply: data.reply, messages: latestMessages };
  }

  async function send(text) {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);
    setDisplay((d) => [...d, { role: "user", text }]);

    // Snapshot messages into a local var — runAgent never touches state directly
    const nextMessages = [...messages, { role: "user", content: text }];

    try {
      const { reply, messages: finalMessages } = await runAgent(nextMessages);
      // Single state write at the very end — no async timing ambiguity
      setMessages(finalMessages);
      setDisplay((d) => [...d, { role: "agent", text: reply }]);
    } catch (e) {
      setDisplay((d) => [...d, { role: "error", text: "Error: " + e.message }]);
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
      {collapsed ? (
        <div
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={() => setCollapsed(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: 40,
              height: 40,
              background: "#2563eb",
              borderRadius: "50%",
              padding: 8,
              color: "#fff",
            }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 10h8M8 14h8" />
          </svg>
        </div>
      ) : (
        <div
          style={{
            maxWidth: 680,
            background: "whitesmoke",
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
            Powered by Gemini + FastAPI · Tab tools run client-side
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              position: "absolute",
              top: 12,
              right: 12,
            }}
          >
            <svg
              onClick={() => setCollapsed(true)}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: 20,
                height: 20,
                cursor: "pointer",
                transform: "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
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
              {display.map((msg, i) => {
                const isUser = msg.role === "user";
                const style = msgColor[msg.role] || msgColor.agent;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "8px 12px",
                        borderRadius: 12,
                        fontSize: msg.role === "tool" ? 12 : 14,
                        lineHeight: 1.55,
                        fontStyle: msg.role === "tool" ? "italic" : "normal",
                        background: style.bg,
                        color: style.color,
                        borderTopRightRadius: isUser ? 4 : 12,
                        borderTopLeftRadius: msg.role === "agent" ? 4 : 12,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
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
                placeholder="e.g. Show me all tabs..."
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
      )}
      <CutGroup />
    </React.Fragment>
  );
}
