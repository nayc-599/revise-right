import random
import copy
import Simulator
import State
import QTable

class QTableSimulator(Simulator.Simulator):
    """
    Q-learning study planner.
    Mirrors QTableSimulator.py from the ambulance project.

    Each 'action' is a weekly schedule: {day(1-7): [task_ids]}.
    Q(state, action) is updated via Monte-Carlo rollouts (same as ambulance project).
    """

    def __init__(self,
                 InitialState: "State.State",
                 LearningRate: float = 0.1,
                 TimeSkip: int = 3,
                 Discount: float = 0.9,
                 CloneCount: int = 20):

        self.LEARNINGRATE = LearningRate
        self.TIMESKIP     = TimeSkip
        self.DISCOUNT     = Discount
        self.CLONECOUNT   = CloneCount
        self.Q            = QTable.QTable()

        super().__init__(InitialState)

    # ── Q-value calculation (same pattern as ambulance project) ─────────

    def CalculateQValue(self, CurrentState: "State.State", PossibleActions: list) -> dict:
        """
        For each candidate schedule, roll out CLONECOUNT futures and
        average the long-term rewards. Update Q-table. Return best action.
        """
        BestMove   = None
        BestQValue = None

        for Action in PossibleActions:
            MeanScore = 0.0

            for _ in range(self.CLONECOUNT):
                CloneSim = CurrentState.Copy()
                CloneSim.ApplySchedule(Action)

                # Simulate TimeSkip future weeks with random actions
                for _ in range(self.TIMESKIP):
                    CloneSim.TimeTick()
                    future_actions = CloneSim.GetPossibleActions(SampleCount=10)
                    if future_actions:
                        rand_action = random.choice(future_actions)
                        CloneSim.ApplySchedule(rand_action)

                CloneScore = CloneSim.GetLongTermReward(Action)
                MeanScore += CloneScore

            MeanScore /= self.CLONECOUNT

            QDelta = self.LEARNINGRATE * (
                MeanScore - self.Q.Access(CurrentState, Action)
            )
            self.Q.Add(CurrentState, Action, QDelta)
            ActionQValue = self.Q.Access(CurrentState, Action)

            if BestQValue is None or ActionQValue > BestQValue:
                BestQValue = ActionQValue
                BestMove   = Action

        return BestMove

    def ChooseAction(self, CurrentState, PossibleActions):
        return self.CalculateQValue(CurrentState, PossibleActions)

    # ── Produce a one-shot recommended schedule ───────────────────────────

    def RecommendWeek(self) -> dict:
        """
        Public entry point: given the current state, return the best
        7-day schedule the Q-learner can find.
        Returns dict {day: [task_ids]}
        """
        options = self.GetOptions(self.Sim)
        if not options:
            return {d: [] for d in range(1, 8)}
        return self.ChooseAction(self.Sim, options)


# ── Quick standalone test ────────────────────────────────────────────────

if __name__ == "__main__":
    import State as S
    import Task as T
    import Confidence as C
    import QuizResult as QR

    state = S.State(Seed=42)

    tasks_data = [
        ("Math Assignment 1",          2.0, 4, C.Confidence(2), QR.QuizResult(0.55)),
        ("History Chapter 1",          1.5, 2, C.Confidence(3), QR.QuizResult(0.80)),
        ("Physics Lab Report",         2.5, 5, C.Confidence(1), QR.QuizResult(0.40)),
        ("English Essay Draft",        1.0, 2, C.Confidence(4), QR.QuizResult(0.90)),
        ("Chemistry Equations",        1.5, 4, C.Confidence(2), QR.QuizResult(0.60)),
        ("Programming Assignment",     2.0, 3, C.Confidence(3), QR.QuizResult(0.75)),
    ]

    for name, duration, diff, conf, quiz in tasks_data:
        t = T.Task(state.IDGenerator.NextTask(), name, duration, diff, conf, quiz)
        state.AddTask(t)

    sim = QTableSimulator(state, LearningRate=0.1, TimeSkip=2, Discount=0.9, CloneCount=15)
    schedule = sim.RecommendWeek()

    task_map = {t.ID: t for t in state.Tasks}
    print("\n=== Recommended Study Plan ===")
    for day in range(1, 8):
        tasks_today = schedule.get(day, [])
        names = [task_map[tid].TaskName for tid in tasks_today if tid in task_map]
        hours = sum(task_map[tid].TaskDuration for tid in tasks_today if tid in task_map)
        print(f"  Day {day}: {names}  ({hours:.1f}h)")

    print(f"\nSchedule score: {state.GetLongTermReward(schedule):.2f}")
    print(f"Q-table entries: {len(sim.Q)}")
