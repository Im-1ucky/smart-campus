"""
main.py
-------
Smart Campus AI Assistant — FastAPI backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.ai_service import get_ai_response

app = FastAPI(title="Smart Campus AI Assistant", version="1.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the frontend (opened as a local file or any local dev server) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    user_id: str = "user123"      # default user_id for single-user demos


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Quick health-check — frontend pings this to know the backend is alive."""
    return {"status": "ok", "message": "Smart Campus AI is running 🚀"}


@app.post("/chat")
async def chat(req: ChatRequest):
    """
    Main chat endpoint.
    Receives a user message + user_id, calls the AI service (with memory context),
    and returns the AI reply.
    """
    response = get_ai_response(req.message, req.user_id)
    return {"response": response}

class MemoryState(BaseModel):
    user_id: str
    state: dict

@app.post("/memory")
async def save_memory(req: MemoryState):
    from services.memory_service import save_user_state
    save_user_state(req.user_id, req.state)
    return {"status": "saved"}

@app.get("/memory/{user_id}")
async def get_memory(user_id: str):
    from services.memory_service import get_user_state
    state = get_user_state(user_id)
    return {"state": state}

@app.get("/history/{user_id}")
async def get_chat_history(user_id: str):
    from services.memory_service import get_history
    history = get_history(user_id)
    return {"history": history}