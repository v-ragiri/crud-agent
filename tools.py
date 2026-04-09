from typing import Any
from database import db

# ── Tool definitions sent to Claude ──────────────────────────────────────────

TOOLS = [
    {
        "name": "create_record",
        "description": "Create a new user or product record.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity": {
                    "type": "string",
                    "enum": ["users", "products"],
                    "description": "Which collection to insert into.",
                },
                "data": {
                    "type": "object",
                    "description": (
                        "Fields to insert. "
                        "Users: name (str), email (str), role (str). "
                        "Products: name (str), price (float), category (str)."
                    ),
                },
            },
            "required": ["entity", "data"],
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
                "data": {"type": "object", "description": "Fields to update."},
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

# ── Tool executor ─────────────────────────────────────────────────────────────

VALID_ENTITIES = {"users", "products"}


def execute_tool(tool_name: str, input: dict) -> dict:
    print(f"Executing tool {tool_name} with input: {input}")
    entity = input.get("entity")
    if entity not in VALID_ENTITIES:
        return {"success": False, "error": f"Unknown entity: {entity}"}

    if tool_name == "create_record":
        record = db.insert(entity, input["data"])
        return {"success": True, "record": record}

    if tool_name == "read_records":
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
        record = db.update(entity, input["id"], input["data"])
        if not record:
            return {"success": False, "error": f"No {entity} with id {input['id']}"}
        return {"success": True, "record": record}

    if tool_name == "delete_record":
        deleted = db.delete(entity, input["id"])
        if not deleted:
            return {"success": False, "error": f"No {entity} with id {input['id']}"}
        return {"success": True, "deleted": deleted}

    return {"success": False, "error": f"Unknown tool: {tool_name}"}