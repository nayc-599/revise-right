import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/useTaskStore';
import { useDayStore } from '../store/useDayStore';
import { useUserStore } from '../store/useUserStore';
import { useGameStore } from '../store/useGameStore';
import { LOCAL_USER_ID } from '../store/useUserStore';
import type { Task } from '../types';
import { PixelButton } from '../components/shared/PixelButton';
import { Modal } from '../components/shared/Modal';
import { TaskCard } from '../components/tasks/TaskCard';

function formatDayLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T12:00:00');
  const [y, m, dStr] = dateStr.split('-');
  const numeric = `${dStr}-${m}-${y}`;
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  return `${weekday} ${numeric}`;
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const start = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Hanging sign style button for top-right */
function HangingSign({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-pixel text-[10px] px-3 py-2 border-2 border-[var(--color-brown)] bg-[var(--color-beige)] text-[var(--color-dark-brown)] rounded shadow-[2px_2px_0_var(--color-pixel-shadow)] hover:brightness-105 focus-visible:outline focus-visible:outline-2"
    >
      {label}
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const today = todayISO();

  const user = useUserStore((s) => s.user);
  const signIn = useUserStore((s) => s.signIn);
  const signOut = useUserStore((s) => s.signOut);

  const startedDate = useDayStore((s) => s.startedDate);
  const endedDate = useDayStore((s) => s.endedDate);
  const {
    showWeekPlan,
    setShowWeekPlan,
    setStartedDate,
    weekPlanMode,
    setWeekPlanMode,
  } = useDayStore();

  const tasks = useTaskStore((s) => s.tasks);
  const moveTaskToDate = useTaskStore((s) => s.moveTaskToDate);
  const addTask = useTaskStore((s) => s.addTask);
  const cancelTask = useTaskStore((s) => s.cancelTask);

  const gameMode = useGameStore((s) => s.gameMode);
  const setTaskQueue = useGameStore((s) => s.setTaskQueue);
  const getTodaysTasks = useTaskStore((s) => s.getTodaysTasks);

  const isOverdue = (t: Task) =>
    t.status !== 'complete' && t.status !== 'cancelled' && t.dueDate < today;

  const weekData = useMemo(() => {
    const activeTasks = tasks.filter(
      (t) => t.status !== 'cancelled' && t.status !== 'complete'
    );
    return getWeekDates().map((date) => {
      const dayTasks = activeTasks.filter(
        (t) => (isOverdue(t) ? today : t.dueDate) === date
      );
      const totalMinutes = dayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
      return { date, tasks: dayTasks, totalMinutes };
    });
  }, [tasks, today]);

  const todayTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.dueDate === today && t.status !== 'cancelled'
      ),
    [tasks, today]
  );
  const completedTodayCount = todayTasks.filter(
    (t) => t.status === 'complete'
  ).length;
  const allTodayComplete =
    todayTasks.length === 0 ||
    completedTodayCount === todayTasks.length;

  const completedTodayForSummary = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status !== 'complete') return false;
        if (t.completedAt) return t.completedAt.slice(0, 10) === today;
        return t.dueDate === today;
      }),
    [tasks, today]
  );

  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState(30);
  const [newDueDate, setNewDueDate] = useState(() => todayISO());
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (_e: React.DragEvent, taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && isOverdue(task)) return;
    setDraggedId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) moveTaskToDate(taskId, date);
    setDraggedId(null);
  };

  const handleAddTask = () => {
    // #region agent log
    fetch('http://127.0.0.1:7672/ingest/84d2d211-bc4e-4c62-89b4-b2bc152088ae', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'c7493e',
      },
      body: JSON.stringify({
        sessionId: 'c7493e',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'HomePage.tsx:handleAddTask',
        message: 'Add task invoked from HomePage',
        data: {
          title: newTitle,
          dueDate: newDueDate,
          hasUser: !!user,
          fromWeekPlan: showWeekPlan,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    if (!newTitle.trim() || !user) return;
    const task: Task = {
      id: crypto.randomUUID(),
      userId: LOCAL_USER_ID,
      title: newTitle.trim(),
      dueDate: newDueDate,
      estimatedMinutes: newMinutes,
      actualMinutes: 0,
      status: 'pending',
      requiresTaskIds: [],
      isAutoGenerated: false,
      createdAt: new Date().toISOString(),
    };
    addTask(task);
    setNewTitle('');
    setNewMinutes(30);
    setNewDueDate(todayISO());
    setAddTaskModalOpen(false);
  };

  const handleConfirmStartDay = () => {
    setShowWeekPlan(false);
    setStartedDate(today);
    navigate('/game-choice');
  };

  const handleResumeGame = () => {
    const todaysTasks = getTodaysTasks();
    const queueIds = todaysTasks
      .filter((t) => t.status !== 'complete')
      .map((t) => t.id);
    setTaskQueue(queueIds);
    if (gameMode === 'wheel') navigate('/game/wheel');
    else navigate('/game/shooting');
  };

  const isNightMode = user && endedDate === today;

  return (
    <div
      className={`relative min-h-screen flex font-body ${
        isNightMode
          ? 'text-[var(--color-beige)]'
          : 'text-[var(--color-dark-brown)]'
      }`}
      style={{
        backgroundImage: 'url("/backgrounds/homepage_background.jpg")',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Title sprite positioned roughly 1/3 from left, 2/3 up from bottom */}
      <img
        src="/sprites/revise_right_title.png"
        alt="Revise Right"
        className="pointer-events-none absolute z-10 w-[260px] max-w-[40vw]"
        style={{
          left: '33%',
          top: '33%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Left: layout column (keeps previous positioning, no placeholder, no middle divider line) */}
      <div className="w-[55%] min-h-screen" />

      {/* Right: conditional content */}
      <div className="flex-1 flex flex-col min-h-screen p-6 relative">
        {/* Hanging signs (only when signed in and not night-mode "only summary" - we show them in all signed-in cases) */}
        {user && (
          <div className="absolute top-4 right-6 flex gap-3">
            <HangingSign
              label="Add / Manage Tasks"
              onClick={() => {
                navigate('/tasks');
              }}
            />
            <HangingSign label="Sign out" onClick={signOut} />
          </div>
        )}

        {/* Case 1: Not signed in — only Sign in */}
        {!user && (
          <div className="flex-1 flex items-center justify-center">
            <PixelButton
              label="Sign in"
              variant="primary"
              className="px-8 py-4 text-sm"
              onClick={signIn}
            />
          </div>
        )}

        {/* Case 2: Signed in, not started today — Start day in center */}
        {user && startedDate !== today && endedDate !== today && (
          <div className="flex-1 flex items-center justify-center">
            <PixelButton
              label="Start day"
              variant="primary"
              className="px-8 py-4 text-sm"
              onClick={() => {
                setWeekPlanMode('start');
                setShowWeekPlan(true);
              }}
            />
          </div>
        )}

        {/* Case 3: Started today, has incomplete tasks — 4 buttons */}
        {user &&
          startedDate === today &&
          endedDate !== today &&
          !allTodayComplete && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 pt-16">
              <PixelButton
                label="Resume game"
                variant="primary"
                className="px-8 py-4 text-sm"
                onClick={handleResumeGame}
              />
              <PixelButton
                label="Edit this week's tasks"
                variant="secondary"
                className="px-8 py-4 text-sm"
                onClick={() => {
                  setWeekPlanMode('edit');
                  setShowWeekPlan(true);
                }}
              />
              <PixelButton
                label="Reflect on your day"
                variant="secondary"
                className="px-8 py-4 text-sm"
                onClick={() => navigate('/reflection')}
              />
              <PixelButton
                label="End day"
                variant="danger"
                className="px-8 py-4 text-sm"
                onClick={() => navigate('/goodnight')}
              />
            </div>
          )}

        {/* Case 4: Started today, all tasks complete — 3 buttons */}
        {user &&
          startedDate === today &&
          endedDate !== today &&
          allTodayComplete && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 pt-16">
              <PixelButton
                label="Edit this week's tasks"
                variant="primary"
                className="px-8 py-4 text-sm"
                onClick={() => {
                  setWeekPlanMode('edit');
                  setShowWeekPlan(true);
                }}
              />
              <PixelButton
                label="Reflect on your day"
                variant="secondary"
                className="px-8 py-4 text-sm"
                onClick={() => navigate('/reflection')}
              />
              <PixelButton
                label="End day"
                variant="danger"
                className="px-8 py-4 text-sm"
                onClick={() => navigate('/goodnight')}
              />
            </div>
          )}

        {/* Case 5: Ended day (night mode) — Today's summary table */}
        {user && endedDate === today && (
          <div className="flex-1 pt-16">
            <h2 className="font-pixel text-xs text-[var(--color-gold)] mb-4">
              Today&apos;s summary
            </h2>
            <div
              className={`rounded border-2 overflow-hidden ${
                isNightMode
                  ? 'border-[var(--color-saloon-wood)]'
                  : 'border-[var(--color-brown)]'
              }`}
            >
              <table className="w-full font-body text-sm">
                <thead>
                  <tr
                    className={
                      isNightMode
                        ? 'bg-[var(--color-casino-dark)] text-[var(--color-gold)]'
                        : 'bg-[var(--color-beige)] text-[var(--color-dark-brown)]'
                    }
                  >
                    <th className="text-left p-2 font-semibold">Task</th>
                    <th className="text-left p-2 font-semibold">
                      Estimated (min)
                    </th>
                    <th className="text-left p-2 font-semibold">
                      Actual (min)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completedTodayForSummary.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-4 text-[var(--color-brown)]"
                      >
                        No tasks completed today.
                      </td>
                    </tr>
                  ) : (
                    completedTodayForSummary.map((task) => (
                      <tr
                        key={task.id}
                        className={
                          isNightMode
                            ? 'border-t border-[var(--color-saloon-wood)]'
                            : 'border-t border-[var(--color-brown)] bg-[var(--color-cream)]'
                        }
                      >
                        <td className="p-2 italic">{task.title}</td>
                        <td className="p-2">{task.estimatedMinutes}</td>
                        <td className="p-2">{task.actualMinutes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Week plan / Edit tasks modal */}
      {showWeekPlan && (
        <Modal
          isOpen={showWeekPlan}
          onClose={() => setShowWeekPlan(false)}
          title="This week's tasks"
        >
          <div className="space-y-4">
            <p className="text-[var(--color-brown)] text-sm">
              Drag tasks between days. Total estimated time under each day. Click
              Confirm to choose your game.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4 max-h-64 overflow-auto">
              {weekData.map(({ date, tasks: dayTasks, totalMinutes }) => (
                <div
                  key={date}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                  className={`min-h-[140px] rounded border-2 border-dashed p-2 transition-colors ${
                    draggedId
                      ? 'border-[var(--color-gold)] bg-[var(--color-cream)]'
                      : 'border-[var(--color-brown)] bg-[var(--color-cream)]'
                  }`}
                >
                  <div className="font-pixel text-[8px] text-[var(--color-dark-brown)] mb-1">
                    {formatDayLabel(date)}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.map((task) => (
                      <div key={task.id} className="space-y-1">
                        {isOverdue(task) && (
                          <div className="text-[10px] font-pixel text-[var(--color-casino-red)]">
                            past due
                          </div>
                        )}
                        <TaskCard
                          task={task}
                          variant="list"
                          draggable={!isOverdue(task)}
                          onDragStart={handleDragStart}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 pt-1 border-t border-[var(--color-brown)] text-xs text-[var(--color-brown)]">
                    Total: {totalMinutes} min
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <PixelButton
                label="Add task"
                variant="primary"
                className="px-6 py-3 text-sm"
                onClick={() => setAddTaskModalOpen(true)}
              />
              {weekPlanMode === 'start' && (
                <PixelButton
                  label="Confirm"
                  variant="primary"
                  className="px-6 py-3 text-sm"
                  onClick={handleConfirmStartDay}
                />
              )}
              <PixelButton
                label="Close"
                variant="ghost"
                className="px-6 py-3 text-sm"
                onClick={() => setShowWeekPlan(false)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Add Task modal */}
      <Modal
        isOpen={addTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        title="Add task"
      >
        <div className="space-y-4">
          <div>
            <label className="block font-body text-sm text-[var(--color-dark-brown)] mb-1">
              Task name
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body"
              placeholder="e.g. Maths revision"
            />
          </div>
          <div>
            <label className="block font-body text-sm text-[var(--color-dark-brown)] mb-1">
              Estimated minutes
            </label>
            <input
              type="number"
              min={1}
              value={newMinutes}
              onChange={(e) => setNewMinutes(Number(e.target.value) || 30)}
              className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body"
            />
          </div>
          <div>
            <label className="block font-body text-sm text-[var(--color-dark-brown)] mb-1">
              Due date
            </label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body"
            />
          </div>
          <PixelButton
            label="Add task"
            variant="primary"
            className="px-6 py-3 text-sm"
            onClick={handleAddTask}
            disabled={!newTitle.trim()}
          />
        </div>
      </Modal>
    </div>
  );
}
