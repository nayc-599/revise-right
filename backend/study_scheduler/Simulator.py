import State

class Simulator:
    """
    Base class for all study planner simulators.
    Mirrors the ambulance project's Simulator.py.

    One 'tick' = planning one week.
    PLAYCAP   = number of weeks to simulate.
    """
    PLAYCAP = 8  # simulate 8 weeks by default

    def __init__(self, InitialState: "State.State"):
        self.Sim       = InitialState
        self.TickCount = 0

    def ChooseAction(self, CurrentState, PossibleActions):
        """Override in subclasses. Return the chosen schedule dict."""
        return None

    def GetOptions(self, CurrentState):
        return CurrentState.GetPossibleActions()

    def AutoPlay(self):
        PossibleActions = self.GetOptions(self.Sim)

        while self.TickCount < self.PLAYCAP:
            if PossibleActions:
                chosen = self.ChooseAction(self.Sim, PossibleActions)
                if chosen:
                    self.Sim.ApplySchedule(chosen)

            self.Sim.TimeTick()
            PossibleActions = self.GetOptions(self.Sim)
            self.TickCount += 1

    def GetStats(self):
        print(self.Sim)
        print(f"Final Score: {self.Sim.GetLongTermReward():.2f}")
        mastered = sum(1 for t in self.Sim.Tasks if t.Mastered)
        print(f"Mastered tasks: {mastered}/{len(self.Sim.Tasks)}")
