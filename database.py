from datetime import datetime, timezone
from typing import Optional

# ── In-memory store ───────────────────────────────────────────────────────────

class InMemoryDB:
    def __init__(self):
        self._store: dict = {
            "users": [],
            "products": [],
        }
        self._next_id = 1

    def next_id(self) -> int:
        id_ = self._next_id
        self._next_id += 1
        return id_

    def now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def all(self, entity: str) -> list:
        return self._store.get(entity, [])

    def get(self, entity: str, id: int) -> Optional[dict]:
        return next((r for r in self.all(entity) if r["id"] == id), None)

    def insert(self, entity: str, data: dict) -> dict:
        record = {"id": self.next_id(), "created_at": self.now(), **data}
        self._store[entity].append(record)
        return record

    def update(self, entity: str, id: int, data: dict) -> Optional[dict]:
        record = self.get(entity, id)
        if not record:
            return None
        record.update({**data, "updated_at": self.now()})
        return record

    def delete(self, entity: str, id: int) -> Optional[dict]:
        record = self.get(entity, id)
        if not record:
            return None
        self._store[entity] = [r for r in self.all(entity) if r["id"] != id]
        return record


# Single shared instance — lives for the lifetime of the server process
db = InMemoryDB()