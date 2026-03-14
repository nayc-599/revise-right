class Confidence:
    """
    Represents the student's self-assessed confidence for a task.
    ConfidenceLevel: 1 (very low) to 5 (very high)
    """
    def __init__(self, ConfidenceLevel: int):
        if not (1 <= ConfidenceLevel <= 5):
            raise ValueError("ConfidenceLevel must be between 1 and 5.")
        self.ConfidenceLevel = ConfidenceLevel

    def NormalisedScore(self) -> float:
        """Returns confidence as a 0.0 - 1.0 value."""
        return (self.ConfidenceLevel - 1) / 4.0

    def __str__(self):
        return f"Confidence({self.ConfidenceLevel}/5)"

    def Copy(self):
        return Confidence(self.ConfidenceLevel)
