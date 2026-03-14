from . import HashableAction

class QTable:
    """
    Maps (State, Action) → Q-value.
    State  : hashable State object
    Action : dict {day(1-7): [task_ids]}
    """
    def __init__(self):
        self.QTable = {}

    def _key(self, State, ActionDict: dict):
        ha = HashableAction.HashableAction(ActionDict)
        return (State, ha)

    def Access(self, State, ActionDict: dict) -> float:
        key = self._key(State, ActionDict)
        return self.QTable.get(key, 0.0)

    def Add(self, State, ActionDict: dict, Delta: float):
        key = self._key(State, ActionDict)
        self.QTable[key] = self.Access(State, ActionDict) + Delta

    def __len__(self):
        return len(self.QTable)
