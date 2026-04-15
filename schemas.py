from pydantic import BaseModel, model_validator
from typing import Any, List, Optional


class Message(BaseModel):
    role: str
    content: Optional[Any] = None   # simple string format: {"role": "user", "content": "hello"}
    parts: Optional[List[Any]] = None  # Gemini parts format: {"role": "user", "parts": [...]}

    @model_validator(mode="after")
    def at_least_one_field(self):
        if self.content is None and self.parts is None:
            raise ValueError("Message must have either 'content' or 'parts'")
        return self


class AgentRequest(BaseModel):
    messages: List[Message]


class PendingToolCall(BaseModel):
    id: Optional[str]  # Gemini may not populate this
    name: str
    args: Any


class AgentResponse(BaseModel):
    reply: Optional[str]
    pending_tool_call: Optional[PendingToolCall]
    messages: List[Any]


class ResumeRequest(BaseModel):
    tool_call_id: str
    tool_name: str
    result: Any
    messages: List[Any]