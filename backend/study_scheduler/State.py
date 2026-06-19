import copy
import random
import math
from datetime import datetime, timedelta
from . import IDGenerator
from . import task as Task
from . import confidence as Confidence
from . import quizResult as QuizResult

class State:

    # Reward weights 
    DUE_DATE_VIOLATION_PENALTY = -1000  # per task scheduled on or after its due date
    RETENTION_REWARD         =  20   # per task scheduled at the right time
    QUIZ_SCORE_REWARD        =  30   # scaled by quiz score × difficulty
    CONFIDENCE_REWARD        =   5   # small bonus for high confidence on hard tasks
    MASTERED_BONUS           =  15   # task fully mastered (quiz + confidence)
    OVERLOAD_PENALTY         = -10   # per hour over the daily limit
    NEGLECT_PENALTY          = -15   # for unmastered tasks with very low retention
    CRAM_PENALTY             =  -8   # same task on consecutive days (anti-cramming)
    DAILY_HOUR_LIMIT         =   6   # max recommended study hours per day

    MAX_TASKS_PER_DAY        =   4   # hard cap for action generation
    DAYS_IN_WEEK             =   7

    def __init__(self,
                 Tasks=None,
                 CurrentDay: int = 0,
                 WeekNumber: int = 0,
                 IDGen=None,
                 Seed=None,
                 SeededGeneratorState=None,
                 Seeded: bool = True,
                 WeekStart: str | None = None):

        self.Tasks       = [t.Copy() for t in Tasks] if Tasks else []
        self.CurrentDay  = CurrentDay
        self.WeekNumber  = WeekNumber
        self.IDGenerator = IDGen if IDGen else IDGenerator.IDGenerator()
        self.Seeded      = Seeded
        self.WeekStart   = WeekStart  # ISO date (YYYY-MM-DD) for day 1 of the planning week

        if Seed is not None:
            self.Seed = Seed
            self.SeededGenerator = random.Random(Seed)
        else:
            self.Seed = None
            self.SeededGenerator = random.Random()

        if SeededGeneratorState is not None:
            self.SeededGenerator.setstate(SeededGeneratorState)

        self.UnseededGenerator = random.Random()

    # Task helpers 

    def AddTask(self, task: "Task.Task"):
        self.Tasks.append(task)

    def ActiveTasks(self):
        """Tasks that still need study (not yet mastered)."""
        return [t for t in self.Tasks if not t.Mastered]

    def NeedsReviewTasks(self):
        """Active tasks whose retention has decayed below threshold."""
        return [t for t in self.ActiveTasks() if t.NeedsReview()]

    def _date_for_day(self, day: int) -> str | None:
        """Return ISO date (YYYY-MM-DD) for the given day index (1-7), or None if WeekStart not set."""
        if not self.WeekStart or day < 1 or day > self.DAYS_IN_WEEK:
            return None
        try:
            d = datetime.strptime(self.WeekStart[:10], "%Y-%m-%d").date()
            d = d + timedelta(days=day - 1)
            return d.isoformat()
        except (ValueError, TypeError):
            return None

    def _task_due_date(self, task) -> str | None:
        """Return task due_date as YYYY-MM-DD string, or None."""
        due = getattr(task, "due_date", None)
        if due is None:
            return None
        if hasattr(due, "isoformat"):
            return due.isoformat()[:10]
        return str(due).strip()[:10] if due else None

    def _schedule_violates_due_dates(self, schedule: dict) -> bool:
        """True if any task is scheduled on a day on or after its due date."""
        if not self.WeekStart:
            return False
        task_map = {t.ID: t for t in self.Tasks}
        for day, task_ids in schedule.items():
            day_date = self._date_for_day(day)
            if day_date is None:
                continue
            for tid in task_ids:
                if tid not in task_map:
                    continue
                task = task_map[tid]
                due = self._task_due_date(task)
                if due is not None and day_date >= due:
                    return True
        return False

    # Action generation 

    def GetPossibleActions(self, SampleCount: int = 60):
        """
        Returns a list of candidate weekly schedules.
        Each schedule is a dict: {day(1-7): [task_id, ...]}

        We sample SampleCount random valid schedules rather than enumerating
        all permutations (space explodes with many tasks).
        """
        active = self.ActiveTasks()
        if not active:
            return []

        rng    = self.SeededGenerator if self.Seeded else self.UnseededGenerator
        sample = set()
        actions = []

        attempts = 0
        while len(actions) < SampleCount and attempts < SampleCount * 10:
            attempts += 1
            schedule = {d: [] for d in range(1, self.DAYS_IN_WEEK + 1)}
            daily_hours = {d: 0.0 for d in range(1, self.DAYS_IN_WEEK + 1)}

            # Shuffle tasks so different orderings are tried
            shuffled = active[:]
            rng.shuffle(shuffled)

            for task in shuffled:
                # Prefer days where retention is low (needs review); exclude days on or after due date
                candidate_days = list(range(1, self.DAYS_IN_WEEK + 1))
                due = self._task_due_date(task)
                if due and self.WeekStart:
                    candidate_days = [d for d in candidate_days if self._date_for_day(d) is not None and self._date_for_day(d) < due]
                if not candidate_days:
                    continue
                rng.shuffle(candidate_days)

                placed = False
                for day in candidate_days:
                    if (len(schedule[day]) < self.MAX_TASKS_PER_DAY and
                            daily_hours[day] + task.TaskDuration <= self.DAILY_HOUR_LIMIT + 2):
                        schedule[day].append(task.ID)
                        daily_hours[day] += task.TaskDuration
                        placed = True
                        break

                # If no day fits within soft limit, place on least-loaded valid day
                if not placed:
                    lightest = min(candidate_days, key=lambda d: daily_hours[d])
                    if len(schedule[lightest]) < self.MAX_TASKS_PER_DAY:
                        schedule[lightest].append(task.ID)
                        daily_hours[lightest] += task.TaskDuration

            # Reject schedule if it violates due dates (defence in depth)
            if self._schedule_violates_due_dates(schedule):
                continue
            # Convert to hashable key to deduplicate
            key = tuple(
                (d, tuple(sorted(schedule[d]))) for d in range(1, self.DAYS_IN_WEEK + 1)
            )
            if key not in sample:
                sample.add(key)
                actions.append(schedule)

        return actions

    # Apply a schedule 

    def ApplySchedule(self, Schedule: dict):
        """
        Mark tasks as studied on their assigned days.
        Updates retention scores accordingly.
        """
        task_map = {t.ID: t for t in self.Tasks}

        for day, task_ids in Schedule.items():
            sim_day = self.CurrentDay + day
            for tid in task_ids:
                if tid in task_map:
                    task_map[tid].Study(sim_day)
                    task_map[tid].CheckMastered()

    # Tick 

    def TimeTick(self):
        """Advance by one week: decay all retention scores."""
        self.WeekNumber  += 1
        self.CurrentDay  += self.DAYS_IN_WEEK

        for task in self.Tasks:
            task.TimeTick(self.CurrentDay)

    # Reward 

    def GetLongTermReward(self, Schedule: dict = None) -> float:
        """
        Evaluate a proposed schedule (or the current task state if no schedule given).
        Higher is better.
        """
        reward = 0.0
        task_map = {t.ID: t for t in self.Tasks}

        if Schedule is not None:
            # 0. Due-date violation: large penalty for any task scheduled on or after its due date
            if self.WeekStart:
                task_map_for_due = {t.ID: t for t in self.Tasks}
                for day, task_ids in Schedule.items():
                    day_date = self._date_for_day(day)
                    if day_date is None:
                        continue
                    for tid in task_ids:
                        if tid not in task_map_for_due:
                            continue
                        task = task_map_for_due[tid]
                        due = self._task_due_date(task)
                        if due is not None and day_date >= due:
                            reward += self.DUE_DATE_VIOLATION_PENALTY
            # 1. Retention reward: scheduled at the right time 
            for day, task_ids in Schedule.items():
                for tid in task_ids:
                    if tid not in task_map:
                        continue
                    task = task_map[tid]
                    sim_day = self.CurrentDay + day
                    days_since = sim_day - task.LastStudiedDay

                    # Optimal review is when retention is near threshold (0.65 - 0.80)
                    projected_R = task.ComputeRetention(days_since)
                    if 0.55 <= projected_R <= 0.85:
                        reward += self.RETENTION_REWARD
                    elif projected_R < 0.55:
                        # Very overdue - still good to review, smaller bonus
                        reward += self.RETENTION_REWARD * 0.5
                    else:
                        # Reviewing too soon - mild penalty (memory still fresh)
                        reward -= 3

            # 2. Anti-cramming: same task on consecutive days 
            for day in range(1, self.DAYS_IN_WEEK):
                today_ids = set(Schedule.get(day,     []))
                next_ids  = set(Schedule.get(day + 1, []))
                overlap   = today_ids & next_ids
                reward   += self.CRAM_PENALTY * len(overlap)

            # 3. Overload penalty 
            for day, task_ids in Schedule.items():
                total_hours = sum(
                    task_map[tid].TaskDuration
                    for tid in task_ids
                    if tid in task_map
                )
                if total_hours > self.DAILY_HOUR_LIMIT:
                    reward += self.OVERLOAD_PENALTY * (total_hours - self.DAILY_HOUR_LIMIT)

            # 4. Neglect penalty: low-retention tasks not scheduled 
            scheduled_ids = {tid for ids in Schedule.values() for tid in ids}
            for task in self.ActiveTasks():
                if task.ID not in scheduled_ids and task.RetentionScore < 0.50:
                    reward += self.NEGLECT_PENALTY

        # 5. Quiz & confidence reward (independent of schedule) 
        for task in self.Tasks:
            if task.QuizResult is not None:
                reward += (self.QUIZ_SCORE_REWARD
                           * task.QuizResult.QuizScore
                           * task.TaskDifficultyLevel)

            if (task.Confidence is not None and
                    task.TaskDifficultyLevel >= 4 and
                    task.Confidence.ConfidenceLevel >= 4):
                reward += self.CONFIDENCE_REWARD

            if task.Mastered:
                reward += self.MASTERED_BONUS

        return reward

    # Hashing (for QTable keys) 

    def __hash__(self):
        tasks_tuple = tuple(
            (t.ID, round(t.RetentionScore, 2), t.LastStudiedDay,
             t.Mastered, t.TaskDifficultyLevel)
            for t in sorted(self.Tasks, key=lambda x: x.ID)
        )
        return hash((tasks_tuple, self.WeekNumber))

    def __eq__(self, other):
        if not isinstance(other, State):
            return False
        return hash(self) == hash(other)

    # Copy 

    def Copy(self):
        return State(
            Tasks=[t.Copy() for t in self.Tasks],
            CurrentDay=copy.deepcopy(self.CurrentDay),
            WeekNumber=copy.deepcopy(self.WeekNumber),
            IDGen=self.IDGenerator.Copy(),
            Seed=copy.deepcopy(self.Seed),
            SeededGeneratorState=self.SeededGenerator.getstate(),
            Seeded=copy.deepcopy(self.Seeded),
            WeekStart=copy.deepcopy(self.WeekStart),
        )

    # Display 

    def __str__(self):
        lines = [f"-- Study Planner State | Week {self.WeekNumber} | Day {self.CurrentDay} --"]
        lines.append("Tasks:")
        for t in self.Tasks:
            lines.append(f"  {t}")
        return "\n".join(lines)
