"""
ai_service.py
-------------
Calls the Groq LLM with the user's full conversation history as context.
Model: llama3-8b-8192  (fast & free on Groq's free tier)
"""

import os
from groq import Groq
from dotenv import load_dotenv
from services.memory_service import get_history, add_message

# Load .env from the backend directory
load_dotenv()

# ── Groq client ───────────────────────────────────────────────────────────────
_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a Smart Campus AI Assistant — a helpful, friendly, and intelligent assistant
for university students. Your role is to help students with:

- Campus events, workshops, hackathons, and fests
- Exam schedules and academic information
- Campus navigation (finding rooms, blocks, labs, canteen, etc.)
- Setting and tracking reminders
- Faculty contact information
- Personalized recommendations based on the student's past interests

IMPORTANT — Memory & Personalization:
- You have access to this student's full conversation history.
- Reference their past interactions naturally to make responses feel personal.
- If the student mentioned attending a workshop, hackathon, or event earlier, bring it up when relevant.
- Example: if they said "I attended a coding workshop", later say "Since you enjoyed that coding workshop, you might like..."
- Always be warm, concise, and campus-focused.
- Use emojis sparingly to make responses friendly and readable.
- Format lists with bullet points and use **bold** for important terms.
- Keep responses concise (2–4 short paragraphs max) unless the student asks for details.
"""


def get_ai_response(message: str, user_id: str) -> str:
    """
    Build the full message array (system + history + new user message),
    call Groq, store the reply in memory, and return the reply text.
    """
    try:
        # 1. Retrieve past conversation history
        history = get_history(user_id)

        # 2. Store the new user message BEFORE the API call
        add_message(user_id, "user", message)

        # 3. Build the messages array for Groq
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *history,                                  # past turns
            {"role": "user", "content": message},      # current turn
        ]

        # 4. Call Groq
        completion = _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=512,
        )

        ai_reply = completion.choices[0].message.content.strip()

        # 5. Store the AI reply in memory for future context
        add_message(user_id, "assistant", ai_reply)

        return ai_reply

    except Exception as e:
        # Return a graceful error message instead of crashing
        error_msg = str(e)
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            return "⚠️ AI service authentication failed. Please check your GROQ_API_KEY in the .env file."
        elif "rate_limit" in error_msg.lower():
            return "⚠️ The AI is a little busy right now (rate limit reached). Please try again in a moment!"
        else:
            return f"⚠️ I encountered an issue connecting to the AI service. Please try again shortly. (Error: {error_msg[:100]})"