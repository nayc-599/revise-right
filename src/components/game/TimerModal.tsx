import { useState, useEffect } from 'react';
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
}

export function TimerModal({
  isOpen,
  onClose,
  taskTitle,
  onComplete,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskTitle}
    >
      <div className="flex flex-col items-center gap-4">
        <CatSprite variant="sitting" size={64} />
        <div
          className="font-pixel text-2xl text-[var(--color-dark-brown)] tabular-nums"
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
                className="p-2 rounded border-2 border-[var(--color-brown)] hover:bg-[var(--color-beige)]"
                aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
              >
                <img
                  src={isPaused ? '/sprites/icon-play.svg' : '/sprites/icon-pause.svg'}
                  alt=""
                  width="24"
                  height="24"
                />
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-2 rounded border-2 border-[var(--color-brown)] hover:bg-[var(--color-beige)]"
                aria-label="Settings"
              >
                <img src="/sprites/icon-settings.svg" alt="" width="24" height="24" />
              </button>
            </div>
            {!isFinished && (
              <PixelButton label="Complete" variant="primary" onClick={handleComplete} />
            )}
            {isFinished && (
              <div className="space-y-3 w-full">
                <p className="font-body text-sm text-[var(--color-brown)]">
                  Time&apos;s up! Mark complete or add more time.
                </p>
                <PixelButton
                  label="Mark completed"
                  variant="primary"
                  onClick={handleComplete}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2">
                  <PixelButton
                    label="+10 min"
                    variant="secondary"
                    onClick={() => addTime(10)}
                  />
                  <PixelButton
                    label="+20 min"
                    variant="secondary"
                    onClick={() => addTime(20)}
                  />
                  <PixelButton
                    label="+30 min"
                    variant="secondary"
                    onClick={() => addTime(30)}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 w-full">
            <p className="font-pixel text-[10px] text-[var(--color-dark-brown)]">
              Edit timer
            </p>
            <PixelButton
              label="Stop task (don’t complete)"
              variant="danger"
              onClick={handleStopWithoutCompleting}
              className="w-full"
            />
            <div className="flex gap-2">
              <PixelButton
                label="+15 min"
                variant="secondary"
                onClick={() => addTime(15)}
              />
              <PixelButton
                label="+30 min"
                variant="secondary"
                onClick={() => addTime(30)}
              />
              <PixelButton
                label="+60 min"
                variant="secondary"
                onClick={() => addTime(60)}
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
            />
            <PixelButton
              label="Back"
              variant="ghost"
              onClick={() => setShowSettings(false)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
