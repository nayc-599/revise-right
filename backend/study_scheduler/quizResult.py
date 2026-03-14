class QuizResult:
    """
    Stores the formal quiz result for a task.
    QuizScore: 0.0 (no marks) to 1.0 (full marks).
    """
    def __init__(self, QuizScore: float):
        if not (0.0 <= QuizScore <= 1.0):
            raise ValueError("QuizScore must be between 0.0 and 1.0.")
        self.QuizScore = QuizScore

    def __str__(self):
        return f"QuizResult({self.QuizScore * 100:.1f}%)"

    def Copy(self):
        return QuizResult(self.QuizScore)
