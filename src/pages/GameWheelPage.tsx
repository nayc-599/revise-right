import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useTaskStore } from '../store/useTaskStore';
import { useTestStore } from '../store/useTestStore';
import { useTimerStore } from '../store/useTimerStore';
import { useQuizStore } from '../store/useQuizStore';
import { PixelButton } from '../components/shared/PixelButton';
import { formatSeconds } from '../utils/timeHelpers';
import { Modal } from '../components/shared/Modal';
import { quizGenerate, patchTaskUnderstanding } from '../api';
import type { Topic } from '../types';
import spinBg from '../../assets/backgrounds/spin_bg.png';

interface WheelSegment {
  id: string;
  title: string;
  start: number; // 0-1
  end: number; // 0-1
  isSpecial: boolean;
}

/** Find a topic matching the task's title from tests (first match). */
function findTopicForTask(taskTitle: string, tests: { id: string; topics?: { id: string; name: string; summaryPdf?: { name: string; dataUrl: string } }[] }[]): { topic: Topic; testId: string } | null {
  for (const test of tests) {
    for (const topic of test.topics ?? []) {
      if (topic.name === taskTitle) return { topic: topic as Topic, testId: test.id };
    }
  }
  return null;
}

function useWheelTimer() {
  const { activeTaskId, isPaused, tick } = useTimerStore();
  useEffect(() => {
    if (!activeTaskId || isPaused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTaskId, isPaused, tick]);
}

export function GameWheelPage() {
  const navigate = useNavigate();
  const funTaskId = useGameStore((s) => s.funTask);
  const getTodaysTasks = useTaskStore((s) => s.getTodaysTasks);
  const tasks = getTodaysTasks();
  const markComplete = useTaskStore((s) => s.markComplete);
  const tests = useTestStore((s) => s.tests);
  const setQuiz = useQuizStore((s) => s.setQuiz);

  const {
    activeTaskId,
    elapsedSeconds,
    estimatedMinutes,
    isPaused,
    pauseTimer,
    resumeTimer,
    addTime,
  } = useTimerStore();

  useWheelTimer();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTimesUp, setShowTimesUp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeModalStep, setCompleteModalStep] = useState<'choice' | 'rating' | 'quizLoading' | 'quizError'>('choice');
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [understandingRating, setUnderstandingRating] = useState(0);
  const [understandingSubmitting, setUnderstandingSubmitting] = useState(false);
  const quizPdfInputRef = useRef<HTMLInputElement>(null);

  const wheelTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'complete' && t.status !== 'cancelled'),
    [tasks]
  );

  const activeTask = wheelTasks.find((t) => t.id === activeTaskId) ?? null;
  const topicForTask = activeTask ? findTopicForTask(activeTask.title, tests) : null;

  const segments: WheelSegment[] = useMemo(() => {
    const n = wheelTasks.length;
    if (n === 0) return [];
    const hasSpecial = funTaskId != null && wheelTasks.some((t) => t.id === funTaskId);

    let specialProb = 0;
    if (hasSpecial) {
      specialProb = Math.min(1 / n, 1 / 8);
    }
    const regularCount = hasSpecial ? n - 1 : n;
    const regularProb = regularCount > 0 ? (1 - specialProb) / regularCount : 0;

    const result: WheelSegment[] = [];
    let cursor = 0;
    for (const t of wheelTasks) {
      const isSpecial = hasSpecial && t.id === funTaskId;
      const p = isSpecial ? specialProb : regularProb;
      const start = cursor;
      const end = cursor + p;
      cursor = end;
      result.push({ id: t.id, title: t.title, start, end, isSpecial });
    }

    // Normalise last segment to 1 to avoid rounding gaps
    if (result.length > 0) {
      result[result.length - 1].end = 1;
    }

    return result;
  }, [wheelTasks, funTaskId]);

  const totalEstimatedSeconds = estimatedMinutes * 60;
  const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);

  useEffect(() => {
    if (activeTaskId && remainingSeconds === 0) {
      setShowTimesUp(true);
    }
  }, [activeTaskId, remainingSeconds]);

  const handleSpin = () => {
    if (wheelTasks.length === 0 || activeTaskId || isSpinning) return;
    if (segments.length === 0) return;
    setIsSpinning(true);
    setShowConfirm(false);
    setSelectedTaskId(null);
    const r = Math.random();
    const seg =
      segments.find((s) => r >= s.start && r < s.end) ?? segments[segments.length - 1];

    // Compute a new rotation so that the chosen segment lands under the pointer at the top.
    const mid = (seg.start + seg.end) / 2;
    const targetAngle = 360 - mid * 360; // so segment center is at 0deg (top)
    const extraTurns = 3 * 360; // add 3 full spins for flair
    setRotation((prev) => prev + extraTurns + targetAngle);

    setTimeout(() => {
      setSelectedTaskId(seg.id);
      setIsSpinning(false);
      setShowConfirm(true);
    }, 2000);
  };

  const handleStartSelected = () => {
    if (!selectedTaskId) return;
    const task = wheelTasks.find((t) => t.id === selectedTaskId);
    if (!task) return;
    useTimerStore.getState().startTimer(task.id, task.estimatedMinutes);
    setShowTimesUp(false);
    setShowConfirm(false);
  };

  const handleComplete = () => {
    if (!activeTaskId) return;
    useTimerStore.getState().stopTimer();
    markComplete(activeTaskId);
    setShowTimesUp(false);
  };

  const handleCompleteClick = () => {
    if (!activeTask?.isAutoGenerated) {
      handleComplete();
      return;
    }
    setShowTimesUp(false);
    setCompleteModalStep('choice');
    setShowCompleteModal(true);
  };

  const closeCompleteModal = () => {
    setShowCompleteModal(false);
    setCompleteModalStep('choice');
    setQuizGenerating(false);
    setUnderstandingRating(0);
    setUnderstandingSubmitting(false);
    if (quizPdfInputRef.current) quizPdfInputRef.current.value = '';
  };

  const handleTakeQuizClick = () => {
    quizPdfInputRef.current?.click();
  };

  const handleQuizPdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;
    setCompleteModalStep('quizLoading');
    setQuizGenerating(true);
    try {
      const questions = await quizGenerate(file);
      setQuizGenerating(false);
      const topicName = file.name.replace(/\.pdf$/i, '');
      closeCompleteModal();
      setShowTimesUp(false);
      setQuiz(questions, topicName);
      navigate('/quiz');
    } catch {
      setQuizGenerating(false);
      setCompleteModalStep('quizError');
    }
  };

  const handleRateUnderstanding = () => {
    setUnderstandingRating(0);
    setCompleteModalStep('rating');
  };

  const handleRatingConfirm = async () => {
    if (understandingRating < 1 || understandingRating > 5 || !activeTaskId) return;
    const taskIdForPatch = topicForTask?.topic.id ?? activeTaskId;
    setUnderstandingSubmitting(true);
    try {
      await patchTaskUnderstanding(taskIdForPatch, understandingRating);
      closeCompleteModal();
    } catch {
      closeCompleteModal();
    } finally {
      setUnderstandingSubmitting(false);
    }
  };

  const handleStopWithoutCompleting = () => {
    useTimerStore.getState().clearTimer();
    setShowTimesUp(false);
  };

  const handleResetTimer = () => {
    if (!activeTaskId) return;
    const task = tasks.find((t) => t.id === activeTaskId);
    if (!task) return;
    useTimerStore.getState().startTimer(task.id, task.estimatedMinutes);
    setShowTimesUp(false);
  };

  const colours = ['#C0392B', '#2471A3', '#1E8449', '#CA6F1E', '#7D3C98', '#148F77'];

  const colorById: Record<string, string> = {};
  const gradientStops =
    segments.length === 0
      ? ''
      : segments
          .map((seg, idx) => {
            const startPct = seg.start * 100;
            const endPct = seg.end * 100;
            const color = seg.isSpecial
              ? '#F4D03F'
              : colours[idx % colours.length];
            colorById[seg.id] = color;
            return `${color} ${startPct}% ${endPct}%`;
          })
          .join(', ');

  const selectedTask =
    wheelTasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div
      className="font-body flex flex-col w-full"
      style={{
        backgroundImage: `url(${spinBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Return to home: fixed in top right */}
      <PixelButton
        label="Return to home"
        variant="ghost"
        onClick={() => {
          if (isSpinning) return;
          navigate('/');
        }}
        className="!bg-[#D4A017] border-2 border-[var(--color-dark-brown)] !text-[var(--color-dark-brown)] font-bold absolute z-10"
        style={{ top: 16, right: 16 }}
      />

      {/* Timer: positioned over the gold frame in the background image */}
      <div
        className="absolute"
        style={{
          top: '13%',
          left: '60%',
          width: '22%',
          height: '12%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p className="font-pixel text-[16px] text-[var(--color-cream)] mb-1 leading-tight">
          Timer
        </p>
        <div className="text-[48px] font-pixel text-[var(--color-cream)] tabular-nums leading-none">
          {activeTaskId ? formatSeconds(remainingSeconds) : '00:00'}
        </div>
      </div>

      {/* Remaining tasks panel: centred under the timer frame */}
      <div
        className="absolute rounded-lg border-2 border-[var(--color-brown)] bg-[var(--color-dark-brown)]/85 overflow-hidden flex flex-col"
        style={{
          left: '60%',
          width: '22%',
          top: 'calc(25% + 60px)',
          maxHeight: '45%',
        }}
      >
        <p className="font-pixel text-[10px] text-[#F5E6C8] p-2 pb-1 shrink-0">
          Remaining Tasks
        </p>
        <div className="p-2 pt-0 flex-1 min-h-0 overflow-hidden">
          {wheelTasks.length === 0 ? (
            <p className="font-body text-[#F5E6C8] text-[11px] italic">
              All tasks complete!
            </p>
          ) : (
            <ul className="space-y-0.5 list-none m-0 p-0">
              {wheelTasks.map((t) => (
                <li
                  key={t.id}
                  className="font-body text-[#F5E6C8] text-[10px] truncate"
                  title={t.title}
                >
                  {t.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4 max-w-6xl mx-auto w-full overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="font-pixel text-sm text-[var(--color-cream)]">
          You spin me right round
        </h2>
      </div>

      <div className="flex flex-1 gap-3 min-h-0 flex-col md:flex-row overflow-hidden">
        {/* Left: spinner */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 shrink-0">
            <div
              className="w-full h-full rounded-full border-[6px] border-[var(--color-brown)] shadow-[0_0_0_4px_var(--color-beige)] transition-transform duration-[2000ms] ease-out"
              style={{
                backgroundImage: gradientStops
                  ? `conic-gradient(${gradientStops})`
                  : 'radial-gradient(circle at center, #fef9c3, #e5d4b1)',
                transform: `rotate(${rotation}deg)`,
              }}
            />
            {/* Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-[var(--color-casino-dark)]" />
          </div>
          <div className="mt-2 flex flex-col items-center gap-1">
            <PixelButton
              label="Spin"
              variant="primary"
              className="px-6 py-2 text-xs"
              onClick={handleSpin}
              disabled={wheelTasks.length === 0 || !!activeTaskId || isSpinning}
            />
            <p className="text-[var(--color-cream)] text-xs">
              {wheelTasks.length === 0
                ? 'No tasks left for today.'
                : 'The golden ★ slice is your fun task.'}
            </p>
          </div>

          {/* Legend / result box */}
          <div className="mt-2 w-full max-w-xs min-h-0 flex flex-col">
            <div className="rounded-lg border-2 border-[var(--color-brown)] bg-[var(--color-dark-brown)]/85 p-2 space-y-2 flex-1 min-h-0 overflow-hidden flex flex-col">
              <div>
                <p className="font-pixel text-[10px] text-[#F5E6C8]">
                  Result
                </p>
                <p className="font-body text-sm text-[#F5E6C8] italic">
                  {selectedTask
                    ? selectedTask.title
                    : 'Spin the wheel to choose your next task.'}
                </p>
              </div>
              {segments.length > 0 && (
                <div className="space-y-1">
                  <p className="font-pixel text-[9px] text-[#F5E6C8]">
                    Legend
                  </p>
                  <ul className="space-y-1 max-h-20 overflow-auto pr-1 min-h-0">
                    {segments.map((seg) => {
                      const task = wheelTasks.find((t) => t.id === seg.id);
                      if (!task) return null;
                      const color = colorById[seg.id] ?? '#ddd';
                      return (
                        <li
                          key={seg.id}
                          className="flex items-center gap-2 text-[11px] text-[#FFFFFF]"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                        >
                          <span
                            className="inline-block w-3 h-3 rounded-sm border border-[var(--color-brown)] shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate flex-1">
                            {seg.isSpecial ? '★ ' : ''}
                            {task.title}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: task + timer and controls */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="space-y-2">
            <div>
              <p className="font-pixel text-[10px] text-[var(--color-cream)]">
                Selected task
              </p>
              <p className="font-body text-sm text-[var(--color-cream)] italic">
                {activeTask?.title ||
                  wheelTasks.find((t) => t.id === selectedTaskId)?.title ||
                  'Spin the wheel to choose your next task.'}
              </p>
            </div>

          </div>

          <div className="mt-2 flex flex-col items-end gap-2 shrink-0">
            <div className="flex gap-2 flex-wrap">
              <PixelButton
                label="Complete"
                variant="primary"
                className="px-4 py-2 text-xs !bg-[#D4A017] border-2 border-[var(--color-dark-brown)] !text-[var(--color-dark-brown)] font-bold"
                onClick={handleComplete}
                disabled={!activeTaskId || isSpinning}
              />
              <PixelButton
                label={activeTaskId && !isPaused ? 'Pause' : 'Play'}
                variant="secondary"
                className="px-4 py-2 text-xs !bg-[#D4A017] border-2 border-[var(--color-dark-brown)] !text-[var(--color-dark-brown)] font-bold"
                onClick={() => {
                  if (!activeTaskId) return;
                  if (isPaused) resumeTimer();
                  else pauseTimer();
                }}
                disabled={!activeTaskId || isSpinning}
              />
              <PixelButton
                label="Settings"
                variant="ghost"
                className="px-3 py-2 text-[10px] !bg-[#4a3728] border-2 border-[var(--color-dark-brown)] !text-[var(--color-cream)] font-bold"
                onClick={() => setShowSettings(true)}
                disabled={!activeTaskId || isSpinning}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Confirm selected task */}
      <Modal
        isOpen={showConfirm && !!selectedTaskId}
        onClose={() => setShowConfirm(false)}
        title="Ready to begin?"
      >
        {selectedTaskId && (
          <div className="space-y-4">
            <p className="text-[var(--color-brown)] text-sm">
              Confirm when you&apos;re ready to begin.
            </p>
            <div className="rounded border-2 border-[var(--color-brown)] bg-[var(--color-cream)] px-4 py-3 text-sm">
              <div className="font-pixel text-[10px] text-[var(--color-dark-brown)] mb-1">
                Next task
              </div>
              <div className="font-body italic text-[var(--color-dark-brown)]">
                {
                  wheelTasks.find((t) => t.id === selectedTaskId)
                    ?.title
                }
              </div>
              <div className="text-xs text-[var(--color-brown)] mt-1">
                Estimated time:{' '}
                {
                  wheelTasks.find((t) => t.id === selectedTaskId)
                    ?.estimatedMinutes
                }{' '}
                min
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <PixelButton
                label="Cancel"
                variant="ghost"
                onClick={() => setShowConfirm(false)}
              />
              <PixelButton
                label="Start task"
                variant="primary"
                onClick={handleStartSelected}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Time's up popup */}
      <Modal
        isOpen={showTimesUp}
        onClose={() => setShowTimesUp(false)}
        title="Time's up!"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-brown)] text-sm">
            Time&apos;s up! What would you like to do?
          </p>
          <div className="space-y-2">
            <p className="font-pixel text-[10px] text-[var(--color-dark-brown)]">
              Add more time
            </p>
            <div className="flex flex-wrap gap-2">
              <PixelButton
                label="+15 min"
                variant="secondary"
                onClick={() => {
                  addTime(15);
                  setShowTimesUp(false);
                }}
              />
              <PixelButton
                label="+30 min"
                variant="secondary"
                onClick={() => {
                  addTime(30);
                  setShowTimesUp(false);
                }}
              />
              <PixelButton
                label="+60 min"
                variant="secondary"
                onClick={() => {
                  addTime(60);
                  setShowTimesUp(false);
                }}
              />
            </div>
          </div>
          <PixelButton
            label="Complete task"
            variant="primary"
            onClick={handleComplete}
            disabled={!activeTaskId}
          />
          <PixelButton
            label="Stop without completing"
            variant="ghost"
            onClick={handleStopWithoutCompleting}
          />
        </div>
      </Modal>

      {/* Settings popup */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Timer settings"
      >
        <div className="space-y-4">
          <PixelButton
            label="Stop task (don’t complete)"
            variant="danger"
            onClick={() => {
              handleStopWithoutCompleting();
              setShowSettings(false);
            }}
          />
          <div className="space-y-2">
            <p className="font-pixel text-[10px] text-[var(--color-dark-brown)]">
              Add time
            </p>
            <div className="flex flex-wrap gap-2">
              <PixelButton
                label="+15 min"
                variant="secondary"
                onClick={() => {
                  addTime(15);
                  setShowSettings(false);
                }}
              />
              <PixelButton
                label="+30 min"
                variant="secondary"
                onClick={() => {
                  addTime(30);
                  setShowSettings(false);
                }}
              />
              <PixelButton
                label="+60 min"
                variant="secondary"
                onClick={() => {
                  addTime(60);
                  setShowSettings(false);
                }}
              />
            </div>
          </div>
          <PixelButton
            label="Reset timer"
            variant="secondary"
            onClick={() => {
              handleResetTimer();
              setShowSettings(false);
            }}
            disabled={!activeTaskId}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showCompleteModal}
        onClose={closeCompleteModal}
        title={completeModalStep === 'rating' ? 'How well did you understand this topic?' : 'Complete'}
      >
        <div className="flex flex-col gap-4">
          {completeModalStep === 'choice' && (
            <>
              <input
                ref={quizPdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleQuizPdfSelect}
                aria-hidden
              />
              <div className="flex gap-3 justify-end">
                <PixelButton
                  label="Take a Quiz"
                  variant="primary"
                  onClick={handleTakeQuizClick}
                  disabled={quizGenerating}
                />
                <PixelButton label="Rate Your Understanding" variant="secondary" onClick={handleRateUnderstanding} />
              </div>
            </>
          )}
          {completeModalStep === 'quizLoading' && (
            <p className="text-sm text-[var(--color-brown)]">Generating quiz...</p>
          )}
          {completeModalStep === 'quizError' && (
            <>
              <p className="text-sm text-[var(--color-casino-red)]">
                Failed to generate quiz. Please try again.
              </p>
              <div className="flex justify-end">
                <PixelButton label="Back" variant="secondary" onClick={() => setCompleteModalStep('choice')} />
              </div>
            </>
          )}
          {completeModalStep === 'rating' && (
            <>
              <p className="text-sm text-[var(--color-brown)]">
                Rate your understanding from 1 (struggled) to 5 (very well).
              </p>
              <div className="flex gap-2 justify-center" role="group" aria-label="Rating 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUnderstandingRating(star)}
                    className={`w-10 h-10 rounded border-2 font-pixel text-sm focus-visible:outline focus-visible:outline-2 ${
                      understandingRating >= star
                        ? 'border-[var(--color-brown)] bg-[var(--color-gold)] text-[var(--color-dark-brown)]'
                        : 'border-[var(--color-brown)] bg-[var(--color-cream)] text-[var(--color-brown)] hover:bg-[var(--color-beige)]'
                    }`}
                    aria-label={`${star} star${star === 1 ? '' : 's'}`}
                    aria-pressed={understandingRating >= star}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <PixelButton
                  label="Confirm"
                  variant="primary"
                  onClick={handleRatingConfirm}
                  disabled={understandingRating < 1 || understandingRating > 5 || understandingSubmitting}
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
