class HashableAction:
    """
    Makes a weekly schedule (dict: day → list[task_id]) hashable
    so it can be used as a key in the QTable.

    ActionDict  e.g. {1: [2, 4], 2: [1], 3: [], 4: [3], 5: [2], 6: [], 7: [1]}
    """
    def __init__(self, ActionDict: dict):
        # Normalise: sort task lists so {1: [4,2]} == {1: [2,4]}
        self.ActionTuple = tuple(
            (day, tuple(sorted(ActionDict.get(day, []))))
            for day in range(1, 8)
        )

    def __eq__(self, other):
        if not isinstance(other, HashableAction):
            return NotImplemented
        return self.ActionTuple == other.ActionTuple

    def __hash__(self):
        return hash(self.ActionTuple)
