import streamlit as st
import pandas as pd
import altair as alt
from datetime import datetime, timedelta
import math

from . import State
from .task import Task
from .confidence import Confidence
from .quizResult import QuizResult
from . import QTableSimulator as QTS

st.set_page_config(page_title="AI Study Planner", layout="wide")

# Helper functions

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def ensure_state():
    if "tasks" not in st.session_state:
        st.session_state.tasks = []       # list of Task objects
        
    if "id_counter" not in st.session_state:
        st.session_state.id_counter = 0
        
    if "schedule" not in st.session_state:
        st.session_state.schedule = None  # dict {1-7: [task_ids]}
        
    if "schedule_score" not in st.session_state:
        st.session_state.schedule_score = None

def next_id():
    st.session_state.id_counter += 1
    return st.session_state.id_counter

def retention_color(r: float) -> str:
    if r >= 0.80:
        return "🟢"
    elif r >= 0.55:
        return "🟡"
    else:
        return "🔴"

def forgetting_curve_points(task: "Task.Task", days: int = 14):
    """Return (day, retention) pairs for plotting."""
    rows = []
    for d in range(0, days + 1):
        r = task.ComputeRetention(d)
        rows.append({"Day": d, "Retention": round(r, 4), "Task": task.TaskName})
    return rows

# App layout 

ensure_state()
st.title("🎓 AI Study Planner")
st.caption("Powered by Q-learning + Ebbinghaus Forgetting Curve")

tab_add, tab_tasks, tab_plan, tab_curve = st.tabs(
    ["➕ Add Tasks", "📋 My Tasks", "📅 Generate Plan", "📉 Forgetting Curves"]
)

# TAB 1 - Add Tasks
with tab_add:
    st.subheader("Add a new study task")

    col1, col2 = st.columns(2)
    with col1:
        task_name = st.text_input("Task name", placeholder="e.g. Study for Math Assignment 1")
        duration  = st.number_input("Estimated duration (hours)", min_value=0.5, max_value=8.0,
                                    value=1.5, step=0.5)
        difficulty = st.slider("Difficulty level", 1, 5, 3,
                               help="1 = very easy, 5 = very hard")

    with col2:
        has_quiz = st.checkbox("I have a quiz result for this task")
        quiz_score = None
        if has_quiz:
            quiz_pct = st.slider("Quiz score (%)", 0, 100, 70)
            quiz_score = quiz_pct / 100.0

        has_conf = st.checkbox("I want to set a confidence level", value=True)
        confidence = None
        if has_conf:
            conf_level = st.slider("Confidence level", 1, 5, 3,
                                   help="1 = very unsure, 5 = very confident")
            confidence = conf_level

        days_since = st.number_input("Days since last studied (0 = never / today)",
                                     min_value=0, max_value=60, value=0)

    if st.button("Add task ✚", type="primary", use_container_width=True):
        if not task_name.strip():
            st.warning("Please enter a task name.")
        else:
            conf_obj = Confidence.Confidence(confidence) if confidence else None
            quiz_obj = QuizResult.QuizResult(quiz_score) if quiz_score is not None else None

            new_task = Task.Task(
                ID=next_id(),
                TaskName=task_name.strip(),
                TaskDuration=duration,
                TaskDifficultyLevel=difficulty,
                TaskConfidence=conf_obj,
                TaskQuizResult=quiz_obj,
                LastStudiedDay=-days_since,  # negative so TimeTick computes correctly
            )
            # Compute initial retention based on days_since
            new_task.RetentionScore = new_task.ComputeRetention(days_since)
            new_task.CheckMastered()

            st.session_state.tasks.append(new_task)
            st.success(f"Added: **{task_name}** (ID {new_task.ID})")
            st.session_state.schedule = None  # invalidate old plan

    st.divider()

    # Quick-add presets
    st.subheader("Or load example tasks")
    if st.button("Load example task set"):
        example_tasks = [
            ("Math Assignment 1",     2.0, 4, 2, 0.55, 5),
            ("History Chapter 1",     1.5, 2, 3, 0.80, 2),
            ("Physics Lab Report",    2.5, 5, 1, 0.40, 8),
            ("English Essay Draft",   1.0, 2, 4, 0.90, 1),
            ("Chemistry Equations",   1.5, 4, 2, 0.60, 6),
            ("Programming Task",      2.0, 3, 3, 0.75, 3),
        ]
        for name, dur, diff, conf, quiz, since in example_tasks:
            t = Task.Task(
                ID=next_id(),
                TaskName=name,
                TaskDuration=dur,
                TaskDifficultyLevel=diff,
                TaskConfidence=Confidence.Confidence(conf),
                TaskQuizResult=QuizResult.QuizResult(quiz),
                LastStudiedDay=-since,
            )
            t.RetentionScore = t.ComputeRetention(since)
            t.CheckMastered()
            st.session_state.tasks.append(t)
        st.success("Loaded 6 example tasks!")
        st.session_state.schedule = None

# ════════════════════════════════════════════════════════════════════════════
# TAB 2 — My Tasks
# ════════════════════════════════════════════════════════════════════════════
with tab_tasks:
    st.subheader("Current task list")

    if not st.session_state.tasks:
        st.info("No tasks yet — add some in the ➕ tab.")
    else:
        rows = []
        for t in st.session_state.tasks:
            rows.append({
                "ID": t.ID,
                "Task": t.TaskName,
                "Duration (h)": t.TaskDuration,
                "Difficulty": t.TaskDifficultyLevel,
                "Retention": f"{retention_color(t.RetentionScore)} {t.RetentionScore:.0%}",
                "Confidence": t.Confidence.ConfidenceLevel if t.Confidence else "—",
                "Quiz Score": f"{t.QuizResult.QuizScore:.0%}" if t.QuizResult else "—",
                "Mastered": "✅" if t.Mastered else "❌",
                "Needs Review": "⚠️ Yes" if t.NeedsReview() else "No",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, height=350)

        st.divider()
        del_id = st.number_input("Delete task by ID", min_value=1, step=1)
        if st.button("Delete task"):
            before = len(st.session_state.tasks)
            st.session_state.tasks = [t for t in st.session_state.tasks if t.ID != del_id]
            if len(st.session_state.tasks) < before:
                st.success(f"Deleted task {del_id}.")
                st.session_state.schedule = None
            else:
                st.warning(f"Task {del_id} not found.")

        if st.button("Clear all tasks", type="secondary"):
            st.session_state.tasks = []
            st.session_state.id_counter = 0
            st.session_state.schedule = None
            st.success("All tasks cleared.")

# ════════════════════════════════════════════════════════════════════════════
# TAB 3 — Generate Plan
# ════════════════════════════════════════════════════════════════════════════
with tab_plan:
    st.subheader("Generate your 7-day study plan")

    if not st.session_state.tasks:
        st.info("Add tasks first in the ➕ tab.")
    else:
        col_a, col_b, col_c = st.columns(3)
        with col_a:
            clone_count  = st.slider("AI clone simulations", 5, 50, 15,
                                     help="More = better quality, slower")
        with col_b:
            time_skip    = st.slider("Future weeks lookahead", 1, 5, 2)
        with col_c:
            sample_count = st.slider("Schedule candidates", 20, 100, 50)

        start_date = st.date_input("Week starting date", value=datetime.today())

        if st.button("▶ Generate AI Study Plan", type="primary", use_container_width=True):
            with st.spinner("Q-learning agent optimising your schedule..."):
                state = State.State(
                    Tasks=st.session_state.tasks,
                    Seed=42,
                    Seeded=True,
                )

                sim = QTS.QTableSimulator(
                    state,
                    LearningRate=0.1,
                    TimeSkip=time_skip,
                    Discount=0.9,
                    CloneCount=clone_count,
                )

                options = sim.GetOptions(sim.Sim)
                if options:
                    # Cap candidates
                    capped = options if len(options) <= sample_count else options[:sample_count]
                    schedule = sim.ChooseAction(sim.Sim, capped)
                    st.session_state.schedule = schedule
                    st.session_state.schedule_score = state.GetLongTermReward(schedule)
                    st.success("Schedule generated!")
                else:
                    st.warning("No valid schedule could be generated for these tasks.")

        # ── Display schedule ──────────────────────────────────────────────
        if st.session_state.schedule:
            schedule  = st.session_state.schedule
            task_map  = {t.ID: t for t in st.session_state.tasks}

            st.divider()
            st.metric("Schedule optimisation score",
                      f"{st.session_state.schedule_score:.1f}",
                      help="Higher is better. Rewards spaced repetition, penalises cramming & overload.")

            st.subheader("📅 Your Weekly Plan")

            plan_rows = []
            for day_idx in range(1, 8):
                task_ids  = schedule.get(day_idx, [])
                date_str  = (start_date + timedelta(days=day_idx - 1)).strftime("%d %b")
                day_name  = DAY_NAMES[day_idx - 1]
                tasks_str = ", ".join(task_map[tid].TaskName
                                      for tid in task_ids if tid in task_map) or "Rest / free day 🎉"
                total_h   = sum(task_map[tid].TaskDuration
                                for tid in task_ids if tid in task_map)
                plan_rows.append({
                    "Day": f"{day_name} ({date_str})",
                    "Tasks": tasks_str,
                    "Total hours": f"{total_h:.1f}h" if total_h else "—",
                })

            st.table(pd.DataFrame(plan_rows).set_index("Day"))

            # ── Workload bar chart ────────────────────────────────────────
            st.subheader("Daily workload")
            wl_rows = []
            for day_idx in range(1, 8):
                task_ids = schedule.get(day_idx, [])
                total_h  = sum(task_map[tid].TaskDuration
                               for tid in task_ids if tid in task_map)
                wl_rows.append({"Day": DAY_NAMES[day_idx - 1], "Hours": total_h})

            wl_df = pd.DataFrame(wl_rows)
            chart = (
                alt.Chart(wl_df).mark_bar(color="#2a9d8f").encode(
                    x=alt.X("Day:N", sort=DAY_NAMES, title=""),
                    y=alt.Y("Hours:Q", title="Study hours"),
                    tooltip=["Day:N", "Hours:Q"]
                )
                + alt.Chart(pd.DataFrame([{"limit": 6}])).mark_rule(
                    color="red", strokeDash=[4, 4]
                ).encode(y="limit:Q")
            ).properties(height=280, title="Recommended hours per day (red = 6h limit)")

            st.altair_chart(chart, use_container_width=True)

            # ── Per-task breakdown ────────────────────────────────────────
            st.subheader("Task assignment detail")
            detail_rows = []
            for day_idx in range(1, 8):
                for tid in schedule.get(day_idx, []):
                    if tid not in task_map:
                        continue
                    t = task_map[tid]
                    detail_rows.append({
                        "Day": DAY_NAMES[day_idx - 1],
                        "Task": t.TaskName,
                        "Duration (h)": t.TaskDuration,
                        "Difficulty": t.TaskDifficultyLevel,
                        "Current Retention": f"{t.RetentionScore:.0%}",
                        "Stability (days)": f"{t.Stability():.1f}",
                    })

            if detail_rows:
                st.dataframe(pd.DataFrame(detail_rows), use_container_width=True)

# ════════════════════════════════════════════════════════════════════════════
# TAB 4 — Forgetting Curves
# ════════════════════════════════════════════════════════════════════════════
with tab_curve:
    st.subheader("📉 Forgetting curves per task")
    st.caption("R(t) = e^(−t / S)  — how quickly memory decays without review")

    if not st.session_state.tasks:
        st.info("Add tasks first to see their forgetting curves.")
    else:
        all_points = []
        for t in st.session_state.tasks:
            all_points.extend(forgetting_curve_points(t, days=21))

        df_curve = pd.DataFrame(all_points)

        chart = (
            alt.Chart(df_curve).mark_line(strokeWidth=2).encode(
                x=alt.X("Day:Q", title="Days since last study"),
                y=alt.Y("Retention:Q", title="Retention (R)", scale=alt.Scale(domain=[0, 1])),
                color=alt.Color("Task:N"),
                tooltip=["Task:N", "Day:Q", alt.Tooltip("Retention:Q", format=".0%")]
            )
            + alt.Chart(pd.DataFrame([{"threshold": Task.Task.RETENTION_THRESHOLD}])).mark_rule(
                color="red", strokeDash=[4, 4], strokeWidth=1.5
            ).encode(y="threshold:Q")
        ).properties(
            height=420,
            title="Forgetting curves (red dashed = review threshold)"
        ).interactive()

        st.altair_chart(chart, use_container_width=True)

        st.caption(
            "Tasks with steeper curves (harder, low quiz score, low confidence) "
            "need to be reviewed sooner. The AI schedules reviews just before the curve "
            "crosses the red threshold — this is optimal spaced repetition."
        )

        # Stability table
        st.subheader("Memory stability per task")
        stab_rows = [
            {
                "Task": t.TaskName,
                "Stability (days)": f"{t.Stability():.1f}",
                "Retention now": f"{t.RetentionScore:.0%}",
                "Needs Review": "⚠️" if t.NeedsReview() else "✅",
            }
            for t in st.session_state.tasks
        ]
        st.dataframe(pd.DataFrame(stab_rows), use_container_width=True)
