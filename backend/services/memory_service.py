"""
memory_service.py
-----------------
SQLite database persistence for conversation history and user campus state.
"""

import sqlite3
import json
import os
from typing import List, Dict

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "campus.db")

# Maximum number of past messages to keep in context (to stay within token limits)
MAX_HISTORY = 20

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                role TEXT,
                content TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_state (
                user_id TEXT PRIMARY KEY,
                state_json TEXT
            )
        ''')
        conn.commit()

# Initialize DB on import
init_db()

def add_message(user_id: str, role: str, content: str) -> None:
    """Append a message to the user's history."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)", (user_id, role, content))
        conn.commit()
        
        # Trim history if needed
        cursor.execute("SELECT id FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT -1 OFFSET ?", (user_id, MAX_HISTORY))
        excess = cursor.fetchall()
        if excess:
            cursor.execute("DELETE FROM messages WHERE user_id = ? AND id <= ?", (user_id, excess[0][0]))
            conn.commit()

def get_history(user_id: str) -> List[Dict[str, str]]:
    """Return the full conversation history for a user (ready to inject into Groq)."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT role, content FROM messages WHERE user_id = ? ORDER BY id ASC", (user_id,))
        rows = cursor.fetchall()
        return [{"role": r[0], "content": r[1]} for r in rows]

def get_summary(user_id: str) -> str:
    """Return a short human-readable summary of the user's past messages."""
    history = get_history(user_id)
    user_messages = [m["content"] for m in history if m["role"] == "user"]
    if not user_messages:
        return "No previous interactions yet."
    
    recent = user_messages[-5:]
    lines = "\n".join(f"- {msg}" for msg in recent)
    return f"Recent student queries:\n{lines}"

def clear_history(user_id: str) -> None:
    """Clear history for a user (e.g. when they start a new session)."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE user_id = ?", (user_id,))
        conn.commit()

def save_user_state(user_id: str, state: dict) -> None:
    """Save the user's campus profile (JSON)."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        state_json = json.dumps(state)
        cursor.execute("INSERT OR REPLACE INTO user_state (user_id, state_json) VALUES (?, ?)", (user_id, state_json))
        conn.commit()

def get_user_state(user_id: str) -> dict:
    """Retrieve the user's campus profile."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT state_json FROM user_state WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row[0])
        return {}