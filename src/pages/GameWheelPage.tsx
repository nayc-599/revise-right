import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useTaskStore } from '../store/useTaskStore';
import { useTimerStore } from '../store/useTimerStore';
import { CatSprite } from '../components/shared/CatSprite';
import { PixelButton } from '../components/shared/PixelButton';
import { formatSeconds } from '../utils/timeHelpers';
import { Modal } from '../components/shared/Modal';

interface WheelSegment {
  id: string;
  title: string;
  start: number; // 0-1
  end: number; // 0-1
  isSpecial: boolean;
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

  const wheelTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'complete' && t.status !== 'cancelled'),
    [tasks]
  );

  const activeTask = wheelTasks.find((t) => t.id === activeTaskId) ?? null;

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

  const colours = ['#f6d365', '#fda085', '#84fab0', '#8fd3f4', '#ffd1ff', '#fbc2eb'];

  const colorById: Record<string, string> = {};
  const gradientStops =
    segments.length === 0
      ? ''
      : segments
          .map((seg, idx) => {
            const startPct = seg.start * 100;
            const endPct = seg.end * 100;
            const color = seg.isSpecial
              ? '#facc15'
              : colours[idx % colours.length];
            colorById[seg.id] = color;
            return `${color} ${startPct}% ${endPct}%`;
          })
          .join(', ');

  const selectedTask =
    wheelTasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div className="font-body p-6 max-w-6xl mx-auto flex flex-col min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-pixel text-sm text-[var(--color-dark-brown)]">
          You spin me right round
        </h2>
        <PixelButton
          label="Return to home"
          variant="ghost"
          onClick={() => {
            if (isSpinning) return;
            navigate('/');
          }}
        />
      </div>

      <div className="flex flex-1 gap-6 flex-col md:flex-row">
        {/* Left: spinner */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 md:w-80 md:h-80">
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
          <div className="mt-4 flex flex-col items-center gap-2">
            <PixelButton
              label="Spin"
              variant="primary"
              className="px-8 py-3 text-sm"
              onClick={handleSpin}
              disabled={wheelTasks.length === 0 || !!activeTaskId || isSpinning}
            />
            <p className="text-[var(--color-brown)] text-xs">
              {wheelTasks.length === 0
                ? 'No tasks left for today.'
                : 'The golden ★ slice is your fun task.'}
            </p>
          </div>

          {/* Legend / result box */}
          <div className="mt-6 w-full max-w-xs">
            <div className="rounded-lg border-2 border-[var(--color-brown)] bg-[var(--color-cream)]/90 p-3 space-y-3">
              <div>
                <p className="font-pixel text-[10px] text-[var(--color-dark-brown)]">
                  Result
                </p>
                <p className="font-body text-sm text-[var(--color-brown)] italic">
                  {selectedTask
                    ? selectedTask.title
                    : 'Spin the wheel to choose your next task.'}
                </p>
              </div>
              {segments.length > 0 && (
                <div className="space-y-1">
                  <p className="font-pixel text-[9px] text-[var(--color-dark-brown)]">
                    Legend
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-auto pr-1">
                    {segments.map((seg) => {
                      const task = wheelTasks.find((t) => t.id === seg.id);
                      if (!task) return null;
                      const color = colorById[seg.id] ?? '#ddd';
                      return (
                        <li
                          key={seg.id}
                          className="flex items-center gap-2 text-[11px] text-[var(--color-dark-brown)]"
                        >
                          <span
                            className="inline-block w-3 h-3 rounded-sm border border-[var(--color-brown)]"
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
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CatSprite variant="sitting" size={80} />
              <div>
                <p className="font-pixel text-xs text-[var(--color-dark-brown)]">
                  Selected task
                </p>
                <p className="font-body text-sm text-[var(--color-brown)] italic">
                  {activeTask?.title ||
                    wheelTasks.find((t) => t.id === selectedTaskId)?.title ||
                    'Spin the wheel to choose your next task.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <p className="font-pixel text-[10px] text-[var(--color-dark-brown)] mb-1">
                Timer
              </p>
              <div className="text-3xl font-pixel text-[var(--color-dark-brown)] tabular-nums">
                {activeTaskId ? formatSeconds(remainingSeconds) : '00:00'}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-end gap-3">
            <div className="flex gap-2">
              <PixelButton
                label="Complete"
                variant="primary"
                className="px-6 py-3 text-sm"
                onClick={handleComplete}
                disabled={!activeTaskId || isSpinning}
              />
              <PixelButton
                label={activeTaskId && !isPaused ? 'Pause' : 'Play'}
                variant="secondary"
                className="px-6 py-3 text-sm"
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
                className="px-4 py-3 text-xs"
                onClick={() => setShowSettings(true)}
                disabled={!activeTaskId || isSpinning}
              />
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
    </div>
  );
}
