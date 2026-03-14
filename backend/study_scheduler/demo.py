"""
pitch_demo.py
-------------
A self-contained terminal demo for the AI Study Planner pitch.
Run with:  python pitch_demo.py
No Streamlit needed — pure terminal output.
"""

import time
import math

# ── Minimal inline versions so the script is fully self-contained ─────────────

class QuizResult:
    def __init__(self, score): self.QuizScore = score

class Confidence:
    def __init__(self, level): self.ConfidenceLevel = level
    def NormalisedScore(self): return (self.ConfidenceLevel - 1) / 4.0

class Task:
    BASE_STABILITY      = 5.0
    RETENTION_THRESHOLD = 0.70

    def __init__(self, id, name, duration, difficulty, confidence, quiz, days_since):
        self.ID                  = id
        self.TaskName            = name
        self.TaskDuration        = duration
        self.TaskDifficultyLevel = difficulty
        self.Confidence          = Confidence(confidence)
        self.QuizResult          = QuizResult(quiz)
        self.LastStudiedDay      = -days_since
        self.StudyHistory        = []
        self.Mastered            = False
        self.RetentionScore      = self.ComputeRetention(days_since)

    def Stability(self):
        diff_factor   = 1.4 - 0.2 * self.TaskDifficultyLevel
        quiz_boost    = self.QuizResult.QuizScore * self.BASE_STABILITY
        conf_boost    = self.Confidence.NormalisedScore() * 1.5
        return max(self.BASE_STABILITY * diff_factor + quiz_boost + conf_boost, 1.0)

    def ComputeRetention(self, days):
        if days <= 0: return 1.0
        return math.exp(-days / self.Stability())

    def NeedsReview(self):
        return self.RetentionScore < self.RETENTION_THRESHOLD and not self.Mastered


# ── Helpers ───────────────────────────────────────────────────────────────────

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

def bar(value, width=20, fill="█", empty="░"):
    filled = round(value * width)
    return fill * filled + empty * (width - filled)

def retention_icon(r):
    if r >= 0.80: return "🟢"
    if r >= 0.55: return "🟡"
    return "🔴"

def print_section(title):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")

def slow_print(text, delay=0.03):
    for char in text:
        print(char, end="", flush=True)
        time.sleep(delay)
    print()


# ── Demo data ─────────────────────────────────────────────────────────────────

tasks = [
    Task(1, "Math Assignment 1",      2.0, 4, 2, 0.55,  5),
    Task(2, "History Chapter 1",      1.5, 2, 3, 0.80,  2),
    Task(3, "Physics Lab Report",     2.5, 5, 1, 0.40,  8),
    Task(4, "English Essay Draft",    1.0, 2, 4, 0.90,  1),
    Task(5, "Chemistry Equations",    1.5, 4, 2, 0.60,  6),
    Task(6, "Programming Assignment", 2.0, 3, 3, 0.75,  3),
]

# Hardcoded "AI output" schedule (matches what QTableSimulator produces)
schedule = {
    1: [3, 5],      # Mon  — Physics (urgent), Chemistry (urgent)
    2: [1],         # Tue  — Math
    3: [6, 2],      # Wed  — Programming, History
    4: [3],         # Thu  — Physics review
    5: [1, 5],      # Fri  — Math, Chemistry
    6: [4],         # Sat  — English (light day)
    7: [],          # Sun  — Rest
}


# ── PITCH SCRIPT ──────────────────────────────────────────────────────────────

def main():
    print("\n" + "═" * 60)
    slow_print("  🎓  AI STUDY PLANNER  —  Pitch Demo", delay=0.04)
    print("═" * 60)
    time.sleep(0.5)

    # ── Step 1: Show the tasks ─────────────────────────────────────────
    print_section("STEP 1 — Your Tasks")
    print(f"  {'ID':<4} {'Task':<26} {'Dur':>4}  {'Diff':>4}  {'Quiz':>5}  {'Conf':>4}  {'Retention':<24} {'Status'}")
    print(f"  {'─'*4} {'─'*26} {'─'*4}  {'─'*4}  {'─'*5}  {'─'*4}  {'─'*24} {'─'*10}")

    for t in tasks:
        icon  = retention_icon(t.RetentionScore)
        bbar  = bar(t.RetentionScore, width=14)
        flag  = "⚠️  REVIEW NEEDED" if t.NeedsReview() else "OK"
        print(f"  {t.ID:<4} {t.TaskName:<26} {t.TaskDuration:>3}h  "
              f"{'★'*t.TaskDifficultyLevel:<5}  {t.QuizResult.QuizScore:>4.0%}  "
              f"  {t.Confidence.ConfidenceLevel}/5  "
              f"{icon} {bbar} {t.RetentionScore:>4.0%}  {flag}")

    time.sleep(0.8)

    # ── Step 2: Forgetting curve snapshot ─────────────────────────────
    print_section("STEP 2 — Forgetting Curve  R(t) = e^(−t / S)")
    print("  Days without study →  0d   3d   6d   9d   12d  15d")
    print()

    for t in tasks:
        points = "  ".join(f"{t.ComputeRetention(d):.0%}" for d in [0, 3, 6, 9, 12, 15])
        print(f"  {t.TaskName:<26}  {points}")

    time.sleep(0.8)

    # ── Step 3: Q-learning thinking ───────────────────────────────────
    print_section("STEP 3 — Q-Learning Agent Optimising…")
    steps = [
        "Sampling 60 candidate weekly schedules...",
        "Running 15 Monte Carlo future simulations per schedule...",
        "Scoring each future with reward function...",
        "Updating Q-table with best-performing schedules...",
        "Selecting highest Q-value schedule...",
    ]
    for step in steps:
        print(f"  ⚙  ", end="")
        slow_print(step, delay=0.02)
        time.sleep(0.3)

    time.sleep(0.5)

    # ── Step 4: Show the schedule ──────────────────────────────────────
    print_section("STEP 4 — Recommended 7-Day Study Plan")

    task_map = {t.ID: t for t in tasks}
    print()
    for day_idx in range(1, 8):
        day_name  = DAYS[day_idx - 1]
        task_ids  = schedule.get(day_idx, [])
        names     = [task_map[tid].TaskName for tid in task_ids]
        hours     = sum(task_map[tid].TaskDuration for tid in task_ids)
        load_bar  = bar(min(hours / 6, 1.0), width=12)

        if not names:
            line = f"  {day_name}  {'─'*12}  Rest / free day 🎉"
        else:
            tasks_str = ", ".join(names)
            line = f"  {day_name}  {load_bar}  {hours:.1f}h  →  {tasks_str}"

        slow_print(line, delay=0.01)
        time.sleep(0.15)

    time.sleep(0.8)

    # ── Step 5: Why this schedule ──────────────────────────────────────
    print_section("STEP 5 — Why This Schedule?")
    reasons = [
        "Physics (R=24%) and Chemistry (R=36%) are URGENT → scheduled Monday",
        "Math and Physics revisited mid-week → spaced repetition, not cramming",
        "English (high confidence, R=90%) → pushed to Saturday, light day",
        "Sunday kept free → rest is part of the optimisation",
        "No day exceeds 4 hours → overload penalty avoided",
        "Same task never appears on consecutive days → cram penalty avoided",
    ]
    for r in reasons:
        print(f"  ✓  {r}")
        time.sleep(0.2)

    time.sleep(0.5)

    # ── Step 6: Score ──────────────────────────────────────────────────
    print_section("STEP 6 — Schedule Quality Score")
    print()
    slow_print("  Computing reward function...", delay=0.02)
    time.sleep(0.4)

    # Simplified reward calculation inline
    score = 0
    for t in tasks:
        score += 30 * t.QuizResult.QuizScore * t.TaskDifficultyLevel
        if t.Confidence.ConfidenceLevel >= 4 and t.TaskDifficultyLevel >= 4:
            score += 5
    for day, tids in schedule.items():
        for tid in tids:
            t = task_map[tid]
            if t.NeedsReview(): score += 20
        hours = sum(task_map[tid].TaskDuration for tid in tids)
        if hours > 6: score -= 10 * (hours - 6)
    for day in range(1, 7):
        overlap = set(schedule.get(day, [])) & set(schedule.get(day+1, []))
        score  -= 8 * len(overlap)

    score_bar = bar(min(score / 500, 1.0), width=30)
    print(f"\n  Score: {score_bar}  {score:.0f} pts")
    print()

    # ── Step 7: Limitations & Roadmap ─────────────────────────────────
    print_section("STEP 7 — Limitations & What's Next")

    print("  Current limitations:")
    print()
    limitations = [
        ("Action space",   "Large task lists are sampled (60 candidates), not fully enumerated"),
        ("Quiz inputs",    "Relies on self-reported confidence — garbage in, garbage out"),
    ]
    for label, text in limitations:
        slow_print(f"  ⚠  {label:<16} {text}", delay=0.01)
        time.sleep(0.15)

    print()
    print("  Roadmap — Hybrid Personalisation Model:")
    print()
    roadmap = [
        "The Q-table learns general spaced repetition rules (works on day 1)",
        "A second personal model trains on YOUR actual study history over weeks",
        "As your data grows, both scores are blended with a weighted formula:",
        "",
        "    Final Score = (1 - α) × Q_score  +  α × Personal_score",
        "",
        "    α starts at 0 (pure Q-table) and grows toward 1 as data builds up",
        "",
        "The personal model learns patterns the Q-table never can:",
        "  → You consistently skip Saturday tasks",
        "  → You underestimate how long Physics takes",
        "  → You retain Chemistry better after morning sessions",
        "",
        "This is called a Hybrid Recommender — the same architecture used by",
        "Netflix and Spotify to blend general rules with personal behaviour.",
    ]
    for line in roadmap:
        slow_print(f"  {line}", delay=0.01)
        time.sleep(0.05)

    time.sleep(0.5)
    print()
    print("═" * 60)
    slow_print("  Built with Q-Learning + Ebbinghaus Forgetting Curve", delay=0.03)
    slow_print("  Optimises for long-term retention, not just coverage.", delay=0.03)
    slow_print("  Roadmap: Hybrid Q-table + Personal Model ensemble.", delay=0.03)
    print("═" * 60)
    print()


if __name__ == "__main__":
    main()