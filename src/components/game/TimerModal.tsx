import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../shared/Modal';
import { PixelButton } from '../shared/PixelButton';
import { CatSprite } from '../shared/CatSprite';
import { useTimerStore } from '../../store/useTimerStore';
import { useTaskStore } from '../../store/useTaskStore';
import { formatSeconds } from '../../utils/timeHelpers';

function useTimerTick() {
  const { activeTaskId, isPaused, tick } = useTimerStore();
  useEffect(() => {
    if (!activeTaskId || isPaused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTaskId, isPaused, tick]);
}

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  onComplete: () => void;
  /** When true, render timer content centered on page with no card (e.g. over full-screen background). */
  embedOnBackground?: boolean;
}

export function TimerModal({
  isOpen,
  onClose,
  taskTitle,
  onComplete,
  embedOnBackground = false,
}: TimerModalProps) {
  const {
    elapsedSeconds,
    estimatedMinutes,
    isPaused,
    pauseTimer,
    resumeTimer,
    addTime,
    activeTaskId,
  } = useTimerStore();

  const totalEstimatedSeconds = estimatedMinutes * 60;
  const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);
  const isFinished = remainingSeconds <= 0;
  const [showSettings, setShowSettings] = useState(false);

  useTimerTick();

  useEffect(() => {
    if (!embedOnBackground || !isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [embedOnBackground, isOpen, onClose]);

  const handleComplete = () => {
    if (activeTaskId) useTimerStore.getState().stopTimer();
    onComplete();
    onClose();
  };

  const handleStopWithoutCompleting = () => {
    useTimerStore.getState().clearTimer();
    onClose();
  };

  if (!isOpen) return null;

  const timerContent = (
    <div className="flex flex-col items-center gap-4">
      {!embedOnBackground && <CatSprite variant="sitting" size={64} />}
      <div
        className={`font-pixel tabular-nums ${
          embedOnBackground
            ? 'text-5xl sm:text-6xl text-[var(--color-cream)]'
            : 'text-2xl text-[var(--color-dark-brown)]'
        }`}
        aria-live="polite"
      >
        {isFinished ? '00:00' : formatSeconds(remainingSeconds)}
      </div>
      {!showSettings ? (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => (isPaused ? resumeTimer() : pauseTimer())}
              className={
                embedOnBackground
                  ? 'p-3 sm:p-4 rounded border-2 border-[var(--color-cream)]/80 hover:bg-white/10'
                  : 'p-2 rounded border-2 border-[var(--color-brown)] hover:bg-[var(--color-beige)]'
              }
              aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
            >
              <img
                src={isPaused ? '/sprites/icon-play.svg' : '/sprites/icon-pause.svg'}
                alt=""
                width={embedOnBackground ? 32 : 24}
                height={embedOnBackground ? 32 : 24}
                className={embedOnBackground ? 'invert opacity-90' : ''}
              />
            </button>
            {!embedOnBackground && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-2 rounded border-2 border-[var(--color-brown)] hover:bg-[var(--color-beige)]"
                aria-label="Settings"
              >
                <img src="/sprites/icon-settings.svg" alt="" width="24" height="24" />
              </button>
            )}
          </div>
          {!isFinished && (
            <PixelButton
              label="Complete"
              variant="primary"
              onClick={handleComplete}
              className={embedOnBackground ? 'px-10 py-4 text-lg' : ''}
            />
          )}
          {isFinished && (
            <div className={embedOnBackground ? 'space-y-3 w-full max-w-sm' : 'space-y-3 w-full'}>
              <p
                className={
                  embedOnBackground
                    ? 'font-body text-base sm:text-lg text-[var(--color-cream)] text-center'
                    : 'font-body text-sm text-[var(--color-brown)]'
                }
              >
                Time&apos;s up! Mark complete or add more time.
              </p>
              <PixelButton
                label="Mark completed"
                variant="primary"
                onClick={handleComplete}
                className={embedOnBackground ? 'w-full px-10 py-4 text-lg' : 'w-full'}
              />
              <div className="flex flex-wrap gap-2 justify-center">
                <PixelButton
                  label="+10 min"
                  variant="secondary"
                  onClick={() => addTime(10)}
                  className={embedOnBackground ? 'px-6 py-3 text-base' : ''}
                />
                <PixelButton
                  label="+20 min"
                  variant="secondary"
                  onClick={() => addTime(20)}
                  className={embedOnBackground ? 'px-6 py-3 text-base' : ''}
                />
                <PixelButton
                  label="+30 min"
                  variant="secondary"
                  onClick={() => addTime(30)}
                  className={embedOnBackground ? 'px-6 py-3 text-base' : ''}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={embedOnBackground ? 'space-y-3 w-full max-w-sm' : 'space-y-3 w-full'}>
          <p
            className={
              embedOnBackground
                ? 'font-pixel text-sm text-[var(--color-cream)]'
                : 'font-pixel text-[10px] text-[var(--color-dark-brown)]'
            }
          >
            Edit timer
          </p>
          <PixelButton
            label="Stop task (don't complete)"
            variant="danger"
            onClick={handleStopWithoutCompleting}
            className={embedOnBackground ? 'w-full px-10 py-4 text-lg' : 'w-full'}
          />
          <div className="flex gap-2 flex-wrap justify-center">
            <PixelButton
              label="+15 min"
              variant="secondary"
              onClick={() => addTime(15)}
              className={embedOnBackground ? 'px-6 py-3 text-base' : ''}
            />
            <PixelButton
              label="+30 min"
              variant="secondary"
              onClick={() => addTime(30)}
              className={embedOnBackground ? 'px-6 py-3 text-base' : ''}
            />
            <PixelButton
              label="+60 min"
              variant="secondary"
              onClick={() => addTime(60)}
              className={embedOnBackground ? 'px-6 py-3 text-base' : ''}
            />
          </div>
          <PixelButton
            label="Restart timer"
            variant="ghost"
            onClick={() => {
              const timerStore = useTimerStore.getState();
              const task = useTaskStore.getState().getTaskById(activeTaskId!);
              const originalEstimatedMinutes = task?.estimatedMinutes ?? timerStore.estimatedMinutes;
              timerStore.startTimer(activeTaskId!, originalEstimatedMinutes);
              setShowSettings(false);
            }}
            className={embedOnBackground ? 'w-full text-[var(--color-cream)] hover:bg-white/10' : ''}
          />
          <PixelButton
            label="Back"
            variant="ghost"
            onClick={() => setShowSettings(false)}
            className={embedOnBackground ? 'w-full text-[var(--color-cream)] hover:bg-white/10' : ''}
          />
        </div>
      )}
    </div>
  );

  if (embedOnBackground) {
    const embeddedContent = (
      <div
        className="fixed inset-0 z-50 flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timer-embed-title"
      >
        {/* Right wooden wall area: timer centered in right half */}
        <div className="w-1/2 min-w-[50%] h-full flex items-center justify-center relative">
          <button
            type="button"
            onClick={() => {
              useTimerStore.getState().clearTimer();
              onClose();
            }}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded text-[var(--color-cream)] hover:bg-white/10 font-pixel text-xl z-10"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex flex-col items-center gap-6 sm:gap-8">
            <h2
              id="timer-embed-title"
              className="font-pixel text-xl sm:text-2xl text-[var(--color-cream)] text-center max-w-[90%]"
            >
              {taskTitle}
            </h2>
            {timerContent}
          </div>
        </div>
      </div>
    );
    return createPortal(embeddedContent, document.body);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={taskTitle}>
      {timerContent}
    </Modal>
  );
}
