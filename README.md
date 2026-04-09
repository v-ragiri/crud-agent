# CRUD Agent — FastAPI + PostgreSQL + Claude + React

## Project structure

```
crud-agent/
├── backend/
│   ├── main.py          # FastAPI app + agent loop
│   ├── database.py      # SQLAlchemy engine + session
│   ├── models.py        # User and Product ORM models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── tools.py         # Tool definitions + PostgreSQL executor
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   └── App.jsx      # React chat UI
    └── vite.config.js   # Dev proxy → FastAPI
```

## Setup

### 1. PostgreSQL

Create the database (tables are auto-created on first run):

```bash
createdb crud_agent
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and DATABASE_URL

uvicorn main:app --reload       # runs on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                     # runs on http://localhost:5173
```

Open http://localhost:5173 — the Vite dev server proxies `/api/*` to FastAPI automatically.

## How it works

```
Browser (React)
    │  POST /api/agent  { messages: [...] }
    ▼
FastAPI (/api/agent)
    │  Anthropic API (claude-sonnet-4-6)
    │  ← tool_use: create_record / read_records / update_record / delete_record
    │  execute_tool() → SQLAlchemy → PostgreSQL
    │  ← tool_result → Claude → final reply
    ▼
Browser ← { reply: "...", messages: [...] }
```

## Adding new entities

1. Add a model to `models.py`
2. Register it in `ENTITY_MAP` in `tools.py`
3. Add/update tool descriptions in `TOOLS` in `tools.py`
4. That's it — the agent loop and frontend need no changes

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DATABASE_URL` | PostgreSQL connection string |
