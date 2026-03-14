import sqlite3
import json
import os
from typing import List, Dict

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_THIS_DIR, "notes.db")

def init_quiz_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course TEXT,
        question TEXT,
        options TEXT,  -- JSON string of options
        answer TEXT
    )
    """)
    conn.commit()
    conn.close()

def save_quiz(course: str, questions: List[Dict]) -> List[Dict]:
    """
    questions: list of dicts from QuestionGenerator with keys:
        'question', 'options', 'answer'
    Returns: list of saved quiz items
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    saved_quiz = []
    for q in questions:
        c.execute(
            "INSERT INTO quizzes (course, question, options, answer) VALUES (?, ?, ?, ?)",
            (course, q['question'], json.dumps(q['options']), q['answer'])
        )
        quiz_id = c.lastrowid
        saved_quiz.append({
            "id": quiz_id,
            "question": q['question'],
            "options": q['options'],
            "answer": q['answer']
        })
    
    conn.commit()
    conn.close()
    
    return saved_quiz