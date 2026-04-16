from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import json
import os

from schemas import AgentRequest, AgentResponse, PendingToolCall, ResumeRequest
from tools_cutter import TOOLS, CLIENT_SIDE_TOOLS, execute_tool

app = FastAPI(title="CRUD Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a data management assistant. You manage users, products, and tabs.

Tools available:
- auto_create_tabs_from_tags: create tabs from tags (runs on client). By default creates one tab per tag. Pass tag_names=[...] to create tabs only for specific tags; pass include_untagged=true to also add an Untagged tab
- group_cuts_by_question_type: analyze and suggest logical groups of cuts based on question content/type (runs on client — reads from DOM, no input needed). Returns groups that can be converted to tabs.
- create_tabs_from_groups: create tabs for the grouped cuts by question type. Re-classifies cuts and creates a tab per group. Optionally accept tab_names mapping to customize tab names for each group.
- read_tabs: read/filter tabs (runs on client)
- move_cut_between_tabs: move named cuts or all cuts across one or multiple source tabs into a target tab (runs on client)
- read_records: list or search users/products (runs on server)
- update_record: update a user or product by ID (runs on server)
- delete_record: delete a user or product by ID (runs on server)

Use tools for ALL operations. Be concise.
Never call auto_create_tabs_from_tags unless the user explicitly asks to create/auto-create/generate tabs.
For tab queries (list/read/show/find/filter), prefer read_tabs and do not create tabs implicitly.
Before moving a cut between tabs, call read_tabs if tab/cut names are unclear.
When a user refers to a record by name instead of ID, call read_records first to find the ID.
Confirm what was done after every delete or update."""

GEMINI_TOOLS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name=t["name"],
            description=t["description"],
            parameters=t["input_schema"],
        )
        for t in TOOLS
    ]
)


def _serialize_contents(contents: list) -> list:
    """Convert Gemini Content objects to plain dicts for JSON serialization."""
    out = []
    for c in contents:
        parts = []
        for p in (c.parts or []):
            if p.text is not None:
                parts.append({"type": "text", "text": p.text})
            elif p.function_call is not None:
                parts.append({
                    "type": "function_call",
                    "name": p.function_call.name,
                    "args": dict(p.function_call.args),
                    "id": getattr(p.function_call, "id", None) or p.function_call.name,
                })
            elif p.function_response is not None:
                parts.append({
                    "type": "function_response",
                    "name": p.function_response.name,
                    "response": dict(p.function_response.response),
                })
        out.append({"role": c.role, "parts": parts})
    return out


def _deserialize_contents(raw: list) -> list:
    """Rebuild Gemini Content objects from serialized dicts (for resume)."""
    contents = []
    for item in raw:
        parts = []
        for p in item.get("parts", []):
            if p["type"] == "text":
                parts.append(types.Part(text=p["text"]))
            elif p["type"] == "function_call":
                parts.append(types.Part(
                    function_call=types.FunctionCall(name=p["name"], args=p["args"])
                ))
            elif p["type"] == "function_response":
                parts.append(types.Part(
                    function_response=types.FunctionResponse(
                        name=p["name"], response=p["response"]
                    )
                ))
        contents.append(types.Content(role=item["role"], parts=parts))
    return contents


async def _run_agent_loop(contents: list) -> AgentResponse:
    """
    Core agent loop — shared by both /api/agent and /api/agent/resume.
    Runs until either:
      - The model returns plain text  → returns final AgentResponse with reply
      - A client-side tool is hit     → pauses and returns pending_tool_call
    """
    while True:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[GEMINI_TOOLS],
            ),
            contents=contents,
        )

        candidate = response.candidates[0]
        contents.append(candidate.content)

        parts = candidate.content.parts or []
        function_calls = [p for p in parts if p.function_call is not None]

        if not function_calls:
            # Plain text — we're done
            return AgentResponse(
                reply=response.text or "Done.",
                pending_tool_call=None,
                messages=_serialize_contents(contents),
            )

        # Check if any tool in this batch is a client-side tool.
        # If so, pause on the FIRST client-side one (handle one at a time).
        server_results = []
        paused_on = None

        for part in function_calls:
            fc = part.function_call
            tool_id = getattr(fc, "id", None) or fc.name  # fc.id is None in some SDK versions

            if fc.name in CLIENT_SIDE_TOOLS:
                # Pause — return this tool call to the browser to execute
                paused_on = PendingToolCall(
                    id=tool_id,
                    name=fc.name,
                    args=dict(fc.args),
                )
                break
            else:
                # Server-side — execute immediately
                try:
                    result = execute_tool(fc.name, dict(fc.args))
                except Exception as e:
                    result = {"success": False, "error": str(e)}

                server_results.append(
                    types.Part(
                        function_response=types.FunctionResponse(
                            name=fc.name, response=result
                        )
                    )
                )

        if paused_on:
            # Flush any server-side results we collected before the pause
            if server_results:
                contents.append(types.Content(role="user", parts=server_results))

            return AgentResponse(
                reply=None,
                pending_tool_call=paused_on,
                messages=_serialize_contents(contents),
            )

        # All tools in this batch were server-side — append results and loop
        contents.append(types.Content(role="user", parts=server_results))


@app.post("/api/agent", response_model=AgentResponse)
async def agent(request: AgentRequest):
    """Start a new agent turn. Accepts messages with either 'content' or 'parts'."""
    contents = []
    for m in request.messages:
        role = "user" if m.role == "user" else "model"

        if m.parts is not None:
            # Gemini parts format — reconstruct typed Part objects
            parts = []
            for p in m.parts:
                if p.get("type") == "text":
                    parts.append(types.Part(text=p["text"]))
                elif p.get("type") == "function_call":
                    parts.append(types.Part(
                        function_call=types.FunctionCall(name=p["name"], args=p.get("args", {}))
                    ))
                elif p.get("type") == "function_response":
                    parts.append(types.Part(
                        function_response=types.FunctionResponse(
                            name=p["name"], response=p.get("response", {})
                        )
                    ))
            contents.append(types.Content(role=role, parts=parts))
        else:
            # Simple content string/dict format
            text = m.content if isinstance(m.content, str) else json.dumps(m.content)
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))

    return await _run_agent_loop(contents)


@app.post("/api/agent/resume", response_model=AgentResponse)
async def resume(request: ResumeRequest):
    """
    Resume the agent loop after the client has executed a client-side tool.
    The client sends back the tool result and the message history from the
    paused response, and the loop continues from where it left off.
    """
    contents = _deserialize_contents(request.messages)

    # Append the client's tool result as a function_response
    tool_result_part = types.Part(
        function_response=types.FunctionResponse(
            name=request.tool_name,
            response=request.result if isinstance(request.result, dict)
                     else {"result": request.result},
        )
    )
    contents.append(types.Content(role="user", parts=[tool_result_part]))

    return await _run_agent_loop(contents)