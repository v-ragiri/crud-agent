from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import json
import os

from schemas import AgentRequest, AgentResponse
from tools import TOOLS, execute_tool

app = FastAPI(title="CRUD Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in environment — check your .env file")
client = genai.Client(api_key=api_key)

SYSTEM_PROMPT = """You are a data management assistant. You manage two entities:
- users (fields: name, email, role)
- products (fields: name, price, category)

Use the provided tools for ALL operations. Be concise.
When a user refers to a record by name instead of ID, call read_records first to find the ID.
For deletes and updates, confirm what was done after the tool call succeeds."""

# Convert from our generic tool format to Gemini's FunctionDeclaration format
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

# print(f'Loaded tools: {GEMINI_TOOLS}')

@app.post("/api/agent", response_model=AgentResponse)
async def agent(request: AgentRequest):
    # Build Gemini-style contents from conversation history
    contents = []
    for m in request.messages:
        role = "user" if m.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=m.content)]))

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
        contents.append(candidate.content)  # add model turn to history

        # Collect any function calls in this response
        function_calls = [
            p for p in candidate.content.parts if p.function_call is not None
        ]

        if function_calls:
            # Execute each tool call and collect results
            tool_results = []
            for part in function_calls:
                fc = part.function_call
                try:
                    result = execute_tool(fc.name, dict(fc.args))
                except Exception as e:
                    result = {"success": False, "error": str(e)}

                tool_results.append(
                    types.Part(
                        function_response=types.FunctionResponse(
                            name=fc.name,
                            response=result,
                        )
                    )
                )

            # Append all tool results as a single user turn and loop
            contents.append(types.Content(role="user", parts=tool_results))

        else:
            # Plain text response — we're done
            text = response.text or "Done."
            # Serialize contents back to plain dicts for the response
            messages_out = [{"role": m.role, "content": m.role} for m in request.messages]
            return AgentResponse(reply=text, messages=messages_out)