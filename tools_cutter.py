from typing import Any
from database import db

# ── Tools that run on the CLIENT (browser) ───────────────────────────────────

CLIENT_SIDE_TOOLS = {
    "read_tabs",
    "move_cut_between_tabs",
    "auto_create_tabs_from_tags",
    "remove_tab",
    "remove_all_tabs",
}

# ── Tool definitions sent to the model ───────────────────────────────────────

TOOLS = [
    {
        "name": "auto_create_tabs_from_tags",
        "description": (
            "Auto-create tabs from tags exactly like the UI Auto-create button: "
            "create one tab per tag populated with matching cuts and add an "
            "Untagged tab for cuts without a tag. Reads tags and cuts directly "
            "from the DOM — no input needed from the user. If asked multiple times, will create new tabs with unique names (e.g. 'Sheet 1', 'Sheet 1_v2', etc)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "max_tab_name_length": {
                    "type": "integer",
                    "description": "Maximum tab name length (defaults to 10). Optional.",
                },
            },
        },
    },
    {
        "name": "read_tabs",
        "description": (
            "Read current tabs from existing client state/DOM, optionally filtering "
            "by tab name or cut name. Read-only tool: does not create or modify tabs."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "filter_tab_name": {
                    "type": "string",
                    "description": "Optional — return only tabs whose name contains this string (case-insensitive).",
                },
                "filter_cut_name": {
                    "type": "string",
                    "description": "Optional — within each tab, return only cuts whose name contains this string.",
                },
            },
        },
    },
    {
        "name": "remove_tab",
        "description": "Remove a single tab by name (runs on client).",
        "input_schema": {
            "type": "object",
            "properties": {
                "tab_name": {
                    "type": "string",
                    "description": "Name of the tab to remove (case-insensitive).",
                },
            },
            "required": ["tab_name"],
        },
    },
    {
        "name": "remove_all_tabs",
        "description": "Remove all tabs at once (runs on client). No input required.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "move_cut_between_tabs",
        "description": (
            "Move one or more cuts from a source tab to a target tab (runs on client). "
            "Use cut_name for a single cut or cut_names for multiple cuts, plus source_tab "
            "and target_tab. Source tab, target tab, and every cut name must already exist."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "cut_name": {
                    "type": "string",
                    "description": "Exact cut name to move.",
                },
                "cut_names": {
                    "type": "array",
                    "description": "Exact cut names to move (for multi-cut moves).",
                    "items": {"type": "string"},
                    "minItems": 1,
                },
                "source_tab": {
                    "type": "string",
                    "description": "Existing source tab name.",
                },
                "target_tab": {
                    "type": "string",
                    "description": "Existing target tab name.",
                },
            },
            "required": ["source_tab", "target_tab"],
        },
    },
    {
        "name": "read_records",
        "description": "Fetch records, optionally filtering by field values.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity": {"type": "string", "enum": ["users", "products"]},
                "filters": {
                    "type": "object",
                    "description": 'Optional key/value filters e.g. {"role": "Admin"}.',
                    "properties": {
                        "name":     {"type": "string"},
                        "email":    {"type": "string"},
                        "role":     {"type": "string"},
                        "category": {"type": "string"},
                    },
                },
                "limit": {
                    "type": "integer",
                    "description": "Max records to return (default 50).",
                },
            },
            "required": ["entity"],
        },
    },
    {
        "name": "update_record",
        "description": "Update specific fields on an existing record by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity": {"type": "string", "enum": ["users", "products"]},
                "id": {"type": "integer"},
                "data": {
                    "type": "object",
                    "description": "Fields to update.",
                    "properties": {
                        "name":     {"type": "string"},
                        "email":    {"type": "string"},
                        "role":     {"type": "string"},
                        "price":    {"type": "number"},
                        "category": {"type": "string"},
                    },
                },
            },
            "required": ["entity", "id", "data"],
        },
    },
    {
        "name": "delete_record",
        "description": "Permanently delete a record by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity": {"type": "string", "enum": ["users", "products"]},
                "id": {"type": "integer"},
            },
            "required": ["entity", "id"],
        },
    },
]

# ── Helper functions ──────────────────────────────────────────────────────────

VALID_ENTITIES = {"users", "products"}


def _get_existing_tab_names(tabs: list) -> dict:
    names: dict = {}
    for tab in tabs:
        name = str(tab.get("name", "")).strip().lower()
        if name:
            names[name] = True
    return names


def _generate_unique_tab_name(base_name: str, existing_names: dict, max_len: int) -> str:
    truncated = (base_name or "").strip()[:max_len] or "Sheet"
    lowered = truncated.lower()
    if lowered not in existing_names:
        existing_names[lowered] = True
        return truncated
    suffix_room = 3
    base = truncated[: max(1, max_len - suffix_room)]
    for version in range(2, 100):
        candidate = f"{base}_v{version}"[:max_len]
        lowered = candidate.lower()
        if lowered not in existing_names:
            existing_names[lowered] = True
            return candidate
    return truncated


# ── Server-side tool executor ─────────────────────────────────────────────────

def execute_tool(tool_name: str, input: dict) -> dict:
    print(f"[server] Executing tool: {tool_name} | input: {input}")

    if tool_name == "read_records":
        entity = input.get("entity")
        if entity not in VALID_ENTITIES:
            return {"success": False, "error": f"Unknown entity: {entity}"}
        records = db.all(entity)
        filters = input.get("filters") or {}
        if filters:
            records = [
                r for r in records
                if all(
                    str(val).lower() in str(r.get(key, "")).lower()
                    for key, val in filters.items()
                )
            ]
        limit = input.get("limit", 50)
        return {"count": len(records), "records": records[:limit]}

    if tool_name == "update_record":
        entity = input.get("entity")
        if entity not in VALID_ENTITIES:
            return {"success": False, "error": f"Unknown entity: {entity}"}
        record = db.update(entity, input["id"], input["data"])
        if not record:
            return {"success": False, "error": f"No {entity} with id {input['id']}"}
        return {"success": True, "record": record}

    if tool_name == "delete_record":
        entity = input.get("entity")
        if entity not in VALID_ENTITIES:
            return {"success": False, "error": f"Unknown entity: {entity}"}
        deleted = db.delete(entity, input["id"])
        if not deleted:
            return {"success": False, "error": f"No {entity} with id {input['id']}"}
        return {"success": True, "deleted": deleted}

    return {"success": False, "error": f"Unknown server-side tool: {tool_name}"}