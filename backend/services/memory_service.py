"""
memory_service.py
-----------------
In-memory conversation history per user_id.
Persists for the lifetime of the server process (ideal for hackathon demos).
"""

from collections import defaultdict
from typing import List, Dict

# ── Storage ──────────────────────────────────────────────────────────────────
# { user_id: [ {"role": "user"|"assistant", "content": "..."}, ... ] }
_memory: Dict[str, List[Dict[str, str]]] = defaultdict(list)

# Maximum number of past messages to keep in context (to stay within token limits)
MAX_HISTORY = 20


def add_message(user_id: str, role: str, content: str) -> None:
    """Append a message to the user's history."""
    _memory[user_id].append({"role": role, "content": content})
    # Trim to the last MAX_HISTORY messages
    if len(_memory[user_id]) > MAX_HISTORY:
        _memory[user_id] = _memory[user_id][-MAX_HISTORY:]


def get_history(user_id: str) -> List[Dict[str, str]]:
    """Return the full conversation history for a user (ready to inject into Groq)."""
    return list(_memory[user_id])


def get_summary(user_id: str) -> str:
    """Return a short human-readable summary of the user's past messages.
    
    Used to let the AI mention learned facts in responses.
    """
    user_messages = [m["content"] for m in _memory[user_id] if m["role"] == "user"]
    if not user_messages:
        return "No previous interactions yet."
    
    # Return the last 5 user messages as a quick summary
    recent = user_messages[-5:]
    lines = "\n".join(f"- {msg}" for msg in recent)
    return f"Recent student queries:\n{lines}"


def clear_history(user_id: str) -> None:
    """Clear history for a user (e.g. when they start a new session)."""
    _memory[user_id] = []