from pydantic import BaseModel
from typing import Any, List

class Message(BaseModel):
    role: str
    content: Any

class AgentRequest(BaseModel):
    messages: List[Message]

class AgentResponse(BaseModel):
    reply: str
    messages: List[Any]