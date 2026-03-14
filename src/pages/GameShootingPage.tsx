import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useTaskStore } from '../store/useTaskStore';
import { useTimerStore } from '../store/useTimerStore';
import { CatSprite } from '../components/shared/CatSprite';
import { PixelButton } from '../components/shared/PixelButton';
import { TaskCard } from '../components/tasks/TaskCard';
import { TimerModal } from '../components/game/TimerModal';

export function GameShootingPage() {
  const navigate = useNavigate();
  const taskQueue = useGameStore((s) => s.taskQueue);
  const getTaskById = useTaskStore((s) => s.getTaskById);
  const markComplete = useTaskStore((s) => s.markComplete);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [timerModalOpen, setTimerModalOpen] = useState(false);

  const tasks = taskQueue
    .map((id) => getTaskById(id))
    .filter((t): t is NonNullable<typeof t> => t != null);
  const incompleteTasks = tasks.filter((t) => t.status !== 'complete');

  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : null;

  const handleConfirmTask = () => {
    if (!selectedTask) return;
    useTimerStore.getState().startTimer(selectedTask.id, selectedTask.estimatedMinutes);
    setTimerModalOpen(true);
  };

  const handleTimerComplete = () => {
    if (selectedTaskId) markComplete(selectedTaskId);
    setSelectedTaskId(null);
    setTimerModalOpen(false);
  };

  return (
    <div className="font-body p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <h2 className="font-pixel text-sm text-[var(--color-dark-brown)]">
          Hit me with your best shot
        </h2>
        <PixelButton
          label="Back to home"
          variant="ghost"
          onClick={() => navigate('/')}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        <CatSprite variant="cowboy" size={96} />
        <p className="text-[var(--color-brown)] text-sm">
          Click a wanted poster to choose your task. Confirm to start the timer. When you&apos;re done, we&apos;ll shoot it!
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            variant="wanted-poster"
            completed={task.status === 'complete'}
            onClick={() => setSelectedTaskId(task.id)}
          />
        ))}
      </div>

      {incompleteTasks.length === 0 && (
        <p className="text-[var(--color-brown)] mb-4">All tasks done! Great job.</p>
      )}

      {selectedTask && selectedTask.status !== 'complete' && (
        <div className="flex items-center gap-4 flex-wrap">
          <PixelButton
            label="Confirm — start timer"
            variant="primary"
            onClick={handleConfirmTask}
          />
          <PixelButton
            label="Cancel"
            variant="ghost"
            onClick={() => setSelectedTaskId(null)}
          />
        </div>
      )}

      <TimerModal
        isOpen={timerModalOpen}
        onClose={() => {
          setTimerModalOpen(false);
          setSelectedTaskId(null);
        }}
        taskTitle={selectedTask?.title ?? 'Task'}
        onComplete={handleTimerComplete}
      />
    </div>
  );
}
