"""
FastAPI entry point: quiz (RAG) and scheduler (Q-learning) API + DB.
"""
import os
import sys
import json
import sqlite3
import uuid
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add backend root to path so rag_quiz_system and study_scheduler are importable
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from rag_quiz_system.pipeline import run_quiz_pipeline

# Scheduler: modules use bare "import Task", "import Confidence" so we need study_scheduler on path
SCHEDULER_DIR = BACKEND_DIR / "study_scheduler"
sys.path.insert(0, str(SCHEDULER_DIR))
from State import State
from task import Task as SchedulerTask
from confidence import Confidence
from quizResult import QuizResult
from QTableSimulator import QTableSimulator

app = FastAPI(title="Revise Right API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Database ─────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./revise_right.db")
_raw = DATABASE_URL.replace("sqlite:///", "").strip("/").lstrip("./")
DB_PATH = str(BACKEND_DIR / (_raw or "revise_right.db"))


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quiz_results (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                schedule_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


init_db()


# ─── Request/Response models ─────────────────────────────────────────────

class QuizScoreBody(BaseModel):
    user_id: str
    topic: str
    score: int
    total: int
    timestamp: str


class SchedulerTopicInput(BaseModel):
    name: str
    difficulty: int  # 1-5
    confidence: int  # 1-5
    quiz_score: float  # 0-1
    days_since_last_study: int
    duration_hours: float


class SchedulerGenerateBody(BaseModel):
    topics: list[SchedulerTopicInput]
    available_hours_per_day: float = 6.0
    clone_count: int = 15
    time_skip: int = 2


# ─── Routes ───────────────────────────────────────────────────────────────

@app.post("/api/quiz/generate")
async def api_quiz_generate(pdf_file: UploadFile = File(...)):
    if not pdf_file.filename or not pdf_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="A PDF file is required.")
    try:
        pdf_bytes = await pdf_file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")
    try:
        questions = run_quiz_pipeline(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz pipeline failed: {str(e)}")
    return questions


@app.post("/api/quiz/score")
async def api_quiz_score(body: QuizScoreBody):
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO quiz_results (id, user_id, topic, score, total, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), body.user_id, body.topic, body.score, body.total, body.timestamp),
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"success": True}


@app.post("/api/scheduler/generate")
async def api_scheduler_generate(body: SchedulerGenerateBody):
    if not body.topics:
        return {"schedule": {}, "tasks": []}
    try:
        tasks = []
        for i, t in enumerate(body.topics):
            conf = Confidence(t.confidence) if 1 <= t.confidence <= 5 else None
            quiz = QuizResult(max(0, min(1, t.quiz_score))) if t.quiz_score is not None else None
            task = SchedulerTask(
                ID=i + 1,
                TaskName=t.name,
                TaskDuration=t.duration_hours,
                TaskDifficultyLevel=max(1, min(5, t.difficulty)),
                TaskConfidence=conf,
                TaskQuizResult=quiz,
                RetentionScore=1.0,
                LastStudiedDay=-t.days_since_last_study,
                StudyHistory=[],
                Mastered=False,
            )
            task.RetentionScore = task.ComputeRetention(t.days_since_last_study)
            task.CheckMastered()
            tasks.append(task)

        state = State(Tasks=tasks, Seed=42, Seeded=True)
        sim = QTableSimulator(
            state,
            LearningRate=0.1,
            TimeSkip=body.time_skip,
            Discount=0.9,
            CloneCount=body.clone_count,
        )
        schedule = sim.RecommendWeek()
        # schedule is {1: [id, ...], 2: [...], ...}
        schedule_serializable = {str(k): v for k, v in schedule.items()}
        tasks_info = [{"id": t.ID, "name": t.TaskName, "duration_hours": t.TaskDuration} for t in tasks]
        return {"schedule": schedule_serializable, "tasks": tasks_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scheduler/schedule/{user_id}")
async def api_scheduler_schedule(user_id: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT schedule_json, created_at FROM schedules WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    if not row:
        return {"schedule": {}, "tasks": [], "created_at": None}
    data = json.loads(row[0])
    return {"schedule": data.get("schedule", {}), "tasks": data.get("tasks", []), "created_at": row[1]}


# Persist schedule when frontend calls generate (optional: or have frontend call a separate save endpoint)
# For "persist the schedule" we can save on GET after generate by having frontend POST then GET; or we add POST /api/scheduler/schedule to save.
# Spec says "Persist the schedule" and "GET /api/scheduler/schedule/{user_id} ... so the last generated schedule is always shown".
# So we need to save when we generate. Add a separate endpoint to save schedule for a user, and have the frontend call it after generate.
@app.post("/api/scheduler/schedule/{user_id}")
async def api_scheduler_save_schedule(user_id: str, payload: dict):
    """Save the schedule for user_id. Payload: { "schedule": {...}, "tasks": [...] }."""
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO schedules (id, user_id, schedule_json, created_at) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), user_id, json.dumps(payload), datetime.utcnow().isoformat() + "Z"),
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"success": True}


@app.get("/")
async def root():
    return {"message": "Revise Right API"}
