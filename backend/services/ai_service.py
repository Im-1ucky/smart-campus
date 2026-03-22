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

IMPORTANT — Actual Campus Event Data (USE THESE, do NOT make up events):
1. National Hackathon 2026 — March 22, 2026 · Main Auditorium · Prize: ₹1,00,000 · Themes: AI/ML, IoT, Web3, Social Impact · Team size: 2–4 · Registration deadline: March 20, 5 PM
2. AI & ML Workshop — March 24, 2026 · Lab Block C, Room 101 · 10 AM – 4 PM · Facilitator: Dr. Priya Sharma · Topics: Neural Networks, TensorFlow, Computer Vision · Free for CS students
3. SANGAM Cultural Fest — March 28–30, 2026 · Open Grounds & Main Stage · Dance, Music, Drama, Fashion Show, Photography · Registration deadline: March 25
4. Robotics Competition — April 2, 2026 · Engineering Block · Build and program robots
5. Photography Contest — April 5, 2026 · Art Gallery, Block E · Open to all departments
6. Coding Marathon 2026 — February 15, 2026 · CS Lab, Block B · DSA & algorithms
7. IQnition — Ignite Your Intellect — February 11, 2026 · CSM Block · 2:00 PM – 5:00 PM · Quiz event by Training & Placement Club, G. Pulla Reddy Engineering College (GPREC), Kurnool

Campus Locations:
- Library: Block D, Ground Floor (Mon–Sat, 8 AM – 8 PM)
- Canteen: Block A, Ground Floor (near main gate, 8 AM – 8 PM)
- CS Department: Block B, 2nd Floor (Rooms 201–218)
- Admin Block: Opposite main entrance (Mon–Fri, 9 AM – 5 PM)
- Labs: Block C (Ground & 1st Floor)

CS Faculty:
- Dr. Ramesh Kumar (HOD) — Room 201 · ramesh@campus.edu
- Prof. Anita Sharma (OS) — Room 205 · anita@campus.edu
- Dr. Priya Menon (AI/ML) — Room 208 · priya@campus.edu
- Prof. Vikram Rao (DBMS) — Room 210 · vikram@campus.edu
- Office hours: Mon–Fri, 10 AM – 12 PM & 2 PM – 4 PM

IMPORTANT — Memory & Personalization:
- You have access to this student's full conversation history.
- Reference their past interactions naturally to make responses feel personal.
- If the student mentioned attending a workshop, hackathon, or event earlier, bring it up when relevant.
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