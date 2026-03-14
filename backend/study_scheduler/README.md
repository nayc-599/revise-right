# AI Study Planner

A Q-learning powered study planner that uses the **Ebbinghaus Forgetting Curve**
and spaced repetition principles to generate your optimal 7-day study schedule.

## Architecture (mirrors the ambulance project)

| Study Planner      | Ambulance Project  | Role                          |
|--------------------|--------------------|-------------------------------|
| `Task`             | `Patient`          | The thing being managed       |
| `Day slot`         | `Hospital`         | Where it gets assigned        |
| `Weekly schedule`  | `Dispatch action`  | The action the AI chooses     |
| `State`            | `State`            | Full simulation state         |
| `QTableSimulator`  | `QTableSimulator`  | Q-learning agent              |

## Files

| File                | Description                                              |
|---------------------|----------------------------------------------------------|
| `Task.py`           | Task dataclass + forgetting curve (`R = e^(-t/S)`)      |
| `IDGenerator.py`    | Auto-incrementing task IDs                               |
| `Confidence.py`     | Student confidence level (1–5)                           |
| `QuizResult.py`     | Formal quiz score (0.0–1.0)                              |
| `State.py`          | Core simulation state + reward function                  |
| `HashableAction.py` | Makes weekly schedules hashable for the Q-table          |
| `QTable.py`         | Q-table: (State, Action) → Q-value                       |
| `QTableSimulator.py`| Q-learning agent — chooses best weekly schedule          |
| `Simulator.py`      | Base simulator class                                     |
| `app.py`            | Streamlit dashboard                                      |

## Forgetting Curve Formula

```
R(t) = e ^ ( -t / S )
```

- **R** — retention (0 to 1)
- **t** — days elapsed since last study session
- **S** — stability (how long the memory lasts):
  - Base: 5 days
  - Reduced by difficulty (harder task → lower S)
  - Boosted by quiz score and confidence level

The AI schedules a review when `R` drops below **0.70**.

## Reward Function

The Q-agent maximises a score that combines:

| Signal                         | Effect      |
|--------------------------------|-------------|
| Review at optimal spacing      | +20         |
| High quiz score × difficulty   | +30 scaled  |
| High confidence on hard task   | +5          |
| Task mastered                  | +15         |
| Cramming (same task 2 days)    | −8          |
| Day overloaded (> 6 h)         | −10/h over  |
| Low-retention task not planned | −15         |

## Running

```bash
pip install streamlit pandas altair
streamlit run app.py
```

## Quick test (no UI)

```bash
python QTableSimulator.py
```
