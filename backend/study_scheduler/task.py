import math
import copy
import Confidence
import QuizResult

class Task:
    """
    Represents a single study task (e.g. "Study for Math Assignment 1").

    Forgetting / Recall curve used:
        R(t) = e ^ (-t / S)
    where:
        t = days elapsed since last study session
        S = stability factor  (higher = memory lasts longer)

    Stability S is derived from:
        - TaskDifficultyLevel  (harder task → lower base stability)
        - QuizScore            (good quiz result → higher stability)
        - ConfidenceLevel      (high confidence → small bonus)
    """

    BASE_STABILITY   = 5.0   # days: memory half-life at medium difficulty, no quiz info
    RETENTION_THRESHOLD = 0.70  # schedule a review when R drops below this

    def __init__(self,
                 ID: int,
                 TaskName: str,
                 TaskDuration: float,          # hours
                 TaskDifficultyLevel: int = 3, # 1 (easy) – 5 (hard)
                 TaskConfidence: "Confidence.Confidence" = None,
                 TaskQuizResult: "QuizResult.QuizResult" = None,
                 RetentionScore: float = 1.0,
                 LastStudiedDay: int = 0,      # simulated day index when last studied
                 StudyHistory: list = None,    # list of day indices when studied
                 Mastered: bool = False):

        self.ID                 = ID
        self.TaskName           = TaskName
        self.TaskDuration       = TaskDuration
        self.TaskDifficultyLevel = TaskDifficultyLevel
        self.Confidence         = TaskConfidence
        self.QuizResult         = TaskQuizResult
        self.RetentionScore     = RetentionScore
        self.LastStudiedDay     = LastStudiedDay
        self.StudyHistory       = StudyHistory[:] if StudyHistory else []
        self.Mastered           = Mastered

    # ------------------------------------------------------------------
    # Stability: how long (in days) a memory is expected to last.
    # ------------------------------------------------------------------
    def Stability(self) -> float:
        """
        Compute memory stability S.
        Base stability is reduced by difficulty and boosted by quiz/confidence.
        """
        # Difficulty penalty: hard tasks (5) → S * 0.4, easy tasks (1) → S * 1.2
        difficulty_factor = 1.4 - 0.2 * self.TaskDifficultyLevel

        quiz_boost = 0.0
        if self.QuizResult is not None:
            # Perfect score doubles stability; 0% has no effect
            quiz_boost = self.QuizResult.QuizScore * self.BASE_STABILITY

        confidence_boost = 0.0
        if self.Confidence is not None:
            confidence_boost = self.Confidence.NormalisedScore() * 1.5

        S = self.BASE_STABILITY * difficulty_factor + quiz_boost + confidence_boost
        return max(S, 1.0)  # never below 1 day

    # ------------------------------------------------------------------
    # Forgetting curve: R(t) = e^(-t/S)
    # ------------------------------------------------------------------
    def ComputeRetention(self, DaysSinceLastStudy: int) -> float:
        if DaysSinceLastStudy <= 0:
            return 1.0
        S = self.Stability()
        return math.exp(-DaysSinceLastStudy / S)

    # ------------------------------------------------------------------
    # Called every simulated day to decay retention.
    # ------------------------------------------------------------------
    def TimeTick(self, CurrentDay: int):
        days_elapsed = CurrentDay - self.LastStudiedDay
        self.RetentionScore = self.ComputeRetention(days_elapsed)

    # ------------------------------------------------------------------
    # Called when this task is studied on a given day.
    # ------------------------------------------------------------------
    def Study(self, CurrentDay: int):
        self.LastStudiedDay = CurrentDay
        self.StudyHistory.append(CurrentDay)
        self.RetentionScore = 1.0  # reset to full after studying

    # ------------------------------------------------------------------
    # A task is "mastered" when quiz score ≥ 0.85 AND confidence ≥ 4
    # ------------------------------------------------------------------
    def CheckMastered(self):
        quiz_ok  = self.QuizResult  is not None and self.QuizResult.QuizScore  >= 0.85
        conf_ok  = self.Confidence  is not None and self.Confidence.ConfidenceLevel >= 4
        self.Mastered = quiz_ok and conf_ok

    def NeedsReview(self) -> bool:
        """True when retention has decayed below the threshold."""
        return self.RetentionScore < self.RETENTION_THRESHOLD and not self.Mastered

    # ------------------------------------------------------------------
    def __str__(self):
        conf_str = str(self.Confidence)  if self.Confidence  else "N/A"
        quiz_str = str(self.QuizResult)  if self.QuizResult  else "N/A"
        return (f"Task {self.ID}: '{self.TaskName}' | "
                f"Duration: {self.TaskDuration}h | "
                f"Difficulty: {self.TaskDifficultyLevel}/5 | "
                f"Retention: {self.RetentionScore:.2f} | "
                f"Confidence: {conf_str} | Quiz: {quiz_str} | "
                f"Mastered: {self.Mastered}")

    def Copy(self):
        return Task(
            copy.deepcopy(self.ID),
            copy.deepcopy(self.TaskName),
            copy.deepcopy(self.TaskDuration),
            copy.deepcopy(self.TaskDifficultyLevel),
            self.Confidence.Copy()  if self.Confidence  else None,
            self.QuizResult.Copy()  if self.QuizResult  else None,
            copy.deepcopy(self.RetentionScore),
            copy.deepcopy(self.LastStudiedDay),
            copy.deepcopy(self.StudyHistory),
            copy.deepcopy(self.Mastered),
        )
