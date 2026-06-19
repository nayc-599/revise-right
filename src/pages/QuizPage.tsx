import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizStore } from '../store/useQuizStore';
import { PixelButton } from '../components/shared/PixelButton';
import { quizScore } from '../api';
import { LOCAL_USER_ID } from '../store/useUserStore';

const ADVANCE_DELAY_MS = 1500;

export function QuizPage() {
  const navigate = useNavigate();
  const {
    questions,
    topic,
    currentIndex,
    score,
    answered,
    selectedOption,
    submitAnswer,
    advance,
    reset,
  } = useQuizStore();

  const [advancing, setAdvancing] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const isScoreScreen = questions.length > 0 && currentIndex >= questions.length;
  const currentQuestion = questions[currentIndex];
  const total = questions.length;

  useEffect(() => {
    if (!answered || advancing) return;
    const t = setTimeout(() => {
      setAdvancing(true);
      if (currentIndex + 1 < questions.length) {
        advance();
        setAdvancing(false);
      } else {
        advance();
        setAdvancing(false);
      }
    }, ADVANCE_DELAY_MS);
    return () => clearTimeout(t);
  }, [answered, currentIndex, questions.length, advance, advancing]);

  useEffect(() => {
    if (questions.length === 0 && !isScoreScreen) {
      navigate('/', { replace: true });
    }
  }, [questions.length, isScoreScreen, navigate]);

  useEffect(() => {
    if (!isScoreScreen || scoreSubmitted || total === 0) return;
    let cancelled = false;
    quizScore({
      user_id: LOCAL_USER_ID,
      topic,
      score,
      total,
      timestamp: new Date().toISOString(),
    })
      .then(() => {
        if (!cancelled) setScoreSubmitted(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isScoreScreen, topic, score, total, scoreSubmitted]);

  const handleBackToHome = () => {
    reset();
    navigate('/');
  };

  if (isScoreScreen) {
    return (
      <div className="font-body p-6 max-w-lg mx-auto text-center">
        <h2 className="font-pixel text-sm text-[var(--color-dark-brown)] mb-4">
          Quiz complete
        </h2>
        <p className="text-[var(--color-brown)] text-lg mb-6">
          You scored <strong>{score}</strong> / {total}
        </p>
        <PixelButton
          label="Back to Home"
          variant="primary"
          onClick={handleBackToHome}
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="font-body p-6">
        <p className="text-[var(--color-brown)]">Loading…</p>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D'];
  const options = currentQuestion.options.slice(0, 4);

  return (
    <div className="font-body p-6 max-w-lg mx-auto">
      <div
        className="font-pixel text-[10px] text-[var(--color-brown)] mb-4"
        aria-live="polite"
      >
        Question {currentIndex + 1} of {total}
      </div>
      <h2 className="font-body text-lg text-[var(--color-dark-brown)] mb-6">
        {currentQuestion.question}
      </h2>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const letter = letters[i] ?? '?';
          const isSelected = selectedOption === opt;
          const showCorrect = answered && letter === currentQuestion.answer.toUpperCase();
          const showWrong = answered && isSelected && !showCorrect;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => submitAnswer(opt)}
              className={`w-full text-left px-4 py-3 rounded border-2 font-body transition-colors ${
                showCorrect
                  ? 'border-green-600 bg-green-100 text-green-800'
                  : showWrong
                    ? 'border-red-600 bg-red-100 text-red-800'
                    : 'border-[var(--color-brown)] bg-[var(--color-cream)] hover:bg-[var(--color-beige)]'
              }`}
            >
              <span className="font-pixel text-[10px] mr-2">{letter})</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
