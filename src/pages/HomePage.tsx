import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/useTaskStore';
import { useDayStore } from '../store/useDayStore';
import { useUserStore } from '../store/useUserStore';
import { useGameStore } from '../store/useGameStore';
import { useTestStore } from '../store/useTestStore';
import { LOCAL_USER_ID } from '../store/useUserStore';
import { useQuizStore } from '../store/useQuizStore';
import type { Task } from '../types';
import { PixelButton } from '../components/shared/PixelButton';
import { Modal } from '../components/shared/Modal';
import { TaskCard } from '../components/tasks/TaskCard';
import {
  quizGenerate,
  schedulerGenerate,
  schedulerGetSchedule,
  schedulerSaveSchedule,
} from '../api';

function formatDayLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
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
  const editTask = useTaskStore((s) => s.editTask);
  const cancelTask = useTaskStore((s) => s.cancelTask);
  const markComplete = useTaskStore((s) => s.markComplete);

  const gameMode = useGameStore((s) => s.gameMode);

  const getTaskDisplayDate = (t: Task): string => t.scheduledDate ?? t.dueDate;

  const weekData = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status !== 'cancelled');
    return getWeekDates().map((date) => {
      const dayTasks = activeTasks.filter((t) => getTaskDisplayDate(t) === date);
      const totalMinutes = dayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
      return { date, tasks: dayTasks, totalMinutes };
    });
  }, [tasks]);

  const todayTasks = useMemo(
    () =>
      tasks.filter(
        (t) => getTaskDisplayDate(t) === today && t.status !== 'cancelled'
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
      tasks.filter(
        (t) => getTaskDisplayDate(t) === today && t.status === 'complete'
      ),
    [tasks, today]
  );

  const [addManageOpen, setAddManageOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [manageTab, setManageTab] = useState<'tasks' | 'tests'>('tasks');
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState(30);
  const [newDifficulty, setNewDifficulty] = useState(3);
  const [newConfidence, setNewConfidence] = useState(3);
  const [newDueDate, setNewDueDate] = useState(() => todayISO());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<string, number[]>>({});
  const [scheduleTasks, setScheduleTasks] = useState<{ id: number; name: string; duration_hours: number }[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const setQuiz = useQuizStore((s) => s.setQuiz);

  useEffect(() => {
    if (manageTab !== 'tests') return;
    let cancelled = false;
    schedulerGetSchedule(LOCAL_USER_ID).then((res) => {
      if (!cancelled) {
        setSchedule(res.schedule ?? {});
        setScheduleTasks(res.tasks ?? []);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [manageTab]);

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file?.name.toLowerCase().endsWith('.pdf')) {
      setQuizError('Please select a PDF file.');
      return;
    }
    setQuizError(null);
    setQuizLoading(true);
    try {
      const questions = await quizGenerate(file);
      const topic = file.name.replace(/\.pdf$/i, '').trim() || 'Quiz';
      setQuiz(questions, topic);
      setAddManageOpen(false);
      navigate('/quiz');
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    const topics: { name: string; difficulty: number; confidence: number; quiz_score: number; days_since_last_study: number; duration_hours: number }[] = [];
    tasks
      .filter((t) => t.status !== 'cancelled')
      .forEach((task) => {
        const due = new Date(task.dueDate + 'T12:00:00');
        const todayDate = new Date();
        const diffDays = Math.max(
          0,
          Math.round((todayDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        );
        topics.push({
          name: task.title,
          difficulty: Math.min(5, Math.max(1, task.difficulty || 3)),
          confidence: Math.min(5, Math.max(1, task.confidence || 3)),
          quiz_score: 0,
          days_since_last_study: diffDays || 1,
          duration_hours: Math.max(0.25, task.estimatedMinutes / 60),
        });
      });
    setScheduleError(null);
    setScheduleLoading(true);
    try {
      const res = await schedulerGenerate({ topics });
      setSchedule(res.schedule);
      setScheduleTasks(res.tasks);

      // Clear previous scheduled dates and then apply the new Q-learning schedule.
      tasks.forEach((t) => {
        editTask(t.id, { scheduledDate: undefined });
      });
      const weekDates = getWeekDates();
      Object.entries(res.schedule).forEach(([dayKey, ids]) => {
        const dayIndex = Number(dayKey);
        const date = weekDates[dayIndex - 1];
        if (!date) return;
        ids.forEach((qid) => {
          const schedTask = res.tasks.find((t) => t.id === qid);
          if (!schedTask) return;
          const match = tasks.find((t) => t.title === schedTask.name);
          if (!match) return;

          // Never schedule a task after its due date.
          const safeDate =
            date > match.dueDate ? match.dueDate : date;

          editTask(match.id, { scheduledDate: safeDate });
        });
      });

      await schedulerSaveSchedule(LOCAL_USER_ID, { schedule: res.schedule, tasks: res.tasks });
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to generate schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDragStart = (_e: React.DragEvent, taskId: string) => {
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
    if (!newTitle.trim() || !user) return;
    const task: Task = {
      id: crypto.randomUUID(),
      userId: LOCAL_USER_ID,
      title: newTitle.trim(),
      dueDate: newDueDate,
      difficulty: newDifficulty,
      confidence: newConfidence,
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
    setNewDifficulty(3);
    setNewConfidence(3);
    setNewDueDate(todayISO());
    setAddTaskModalOpen(false);
  };

  const handleConfirmStartDay = () => {
    setShowWeekPlan(false);
    setStartedDate(today);
    navigate('/game-choice');
  };

  const handleResumeGame = () => {
    if (gameMode === 'wheel') navigate('/game/wheel');
    else navigate('/game/shooting');
  };

  const allTasksSorted = useMemo(
    () =>
      [...tasks]
        .filter((t) => t.status !== 'cancelled')
        .sort(
          (a, b) =>
            a.dueDate.localeCompare(b.dueDate) ||
            a.createdAt.localeCompare(b.createdAt)
        ),
    [tasks]
  );

  const editingTask =
    editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null;

  const isNightMode = user && endedDate === today;

  return (
    <div
      className={`min-h-screen flex font-body ${
        isNightMode
          ? 'bg-[var(--color-casino-dark)] text-[var(--color-beige)]'
          : 'bg-[var(--color-cream)] text-[var(--color-dark-brown)]'
      }`}
    >
      {/* Left: image placeholder (most of left side) */}
      <div
        className={`w-[55%] min-h-screen flex items-center justify-center border-r-4 border-[var(--color-brown)] ${
          isNightMode ? 'bg-[#1a1209]' : 'bg-[var(--color-beige)]'
        }`}
      >
        <div
          className={`w-full h-full min-h-[400px] flex items-center justify-center border-2 border-dashed ${
            isNightMode
              ? 'border-[var(--color-saloon-wood)] text-[var(--color-saloon-tan)]'
              : 'border-[var(--color-brown)] text-[var(--color-brown)]'
          }`}
        >
          <span className="font-pixel text-xs opacity-70">
            [ Image placeholder ]
          </span>
        </div>
      </div>

      {/* Right: conditional content */}
      <div className="flex-1 flex flex-col min-h-screen p-6 relative">
        {/* Hanging signs (only when signed in and not night-mode "only summary" - we show them in all signed-in cases) */}
        {user && (
          <div className="absolute top-4 right-6 flex gap-3">
            <HangingSign
              label="Add / Manage Tasks"
              onClick={() => {
                setAddManageOpen(true);
                setManageTab('tasks');
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
                onClick={handleResumeGame}
              />
              <PixelButton
                label="Edit this week's tasks"
                variant="secondary"
                onClick={() => {
                  setWeekPlanMode('edit');
                  setShowWeekPlan(true);
                }}
              />
              <PixelButton
                label="Reflect on your day"
                variant="secondary"
                onClick={() => navigate('/reflection')}
              />
              <PixelButton
                label="End day"
                variant="danger"
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
                onClick={() => {
                  setWeekPlanMode('edit');
                  setShowWeekPlan(true);
                }}
              />
              <PixelButton
                label="Reflect on your day"
                variant="secondary"
                onClick={() => navigate('/reflection')}
              />
              <PixelButton
                label="End day"
                variant="danger"
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
                      <TaskCard
                        key={task.id}
                        task={task}
                        variant="list"
                        draggable
                        onDragStart={handleDragStart}
                      />
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
                onClick={() => setAddTaskModalOpen(true)}
              />
              {weekPlanMode === 'start' && (
                <PixelButton
                  label="Confirm"
                  variant="primary"
                  onClick={handleConfirmStartDay}
                />
              )}
              <PixelButton
                label="Close"
                variant="ghost"
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
              Difficulty (1–5)
            </label>
            <select
              value={newDifficulty}
              onChange={(e) => setNewDifficulty(Number(e.target.value) || 3)}
              className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body"
            >
              <option value={1}>1 – Very easy</option>
              <option value={2}>2 – Easy</option>
              <option value={3}>3 – Medium</option>
              <option value={4}>4 – Hard</option>
              <option value={5}>5 – Very hard</option>
            </select>
          </div>
          <div>
            <label className="block font-body text-sm text-[var(--color-dark-brown)] mb-1">
              Confidence (1–5)
            </label>
            <select
              value={newConfidence}
              onChange={(e) => setNewConfidence(Number(e.target.value) || 3)}
              className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body"
            >
              <option value={1}>1 – Not confident at all</option>
              <option value={2}>2 – A bit unsure</option>
              <option value={3}>3 – Neutral</option>
              <option value={4}>4 – Quite confident</option>
              <option value={5}>5 – Very confident</option>
            </select>
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
            onClick={handleAddTask}
            disabled={!newTitle.trim()}
          />
        </div>
      </Modal>

      {/* Add/Manage Tasks modal */}
      <Modal
        isOpen={addManageOpen}
        onClose={() => {
          setAddManageOpen(false);
          setEditingTaskId(null);
        }}
        title="Add / Manage Tasks"
      >
        <div className="space-y-4">
          <div className="flex gap-2 border-b-2 border-[var(--color-brown)] pb-2">
            <button
              type="button"
              onClick={() => setManageTab('tasks')}
              className={`font-pixel text-[10px] px-3 py-1 rounded ${
                manageTab === 'tasks'
                  ? 'bg-[var(--color-gold)] text-[var(--color-dark-brown)]'
                  : 'bg-[var(--color-cream)] text-[var(--color-brown)]'
              }`}
            >
              Tasks
            </button>
            <button
              type="button"
              onClick={() => setManageTab('tests')}
              className={`font-pixel text-[10px] px-3 py-1 rounded ${
                manageTab === 'tests'
                  ? 'bg-[var(--color-gold)] text-[var(--color-dark-brown)]'
                  : 'bg-[var(--color-cream)] text-[var(--color-brown)]'
              }`}
            >
              Tests
            </button>
          </div>

          {manageTab === 'tasks' && (
            <>
              <PixelButton
                label="+ Add Task"
                variant="primary"
                onClick={() => {
                  setNewTitle('');
                  setNewMinutes(30);
                  setNewDueDate(todayISO());
                  setAddTaskModalOpen(true);
                }}
              />
              <ul className="space-y-2 max-h-64 overflow-auto">
                {allTasksSorted.map((task) => (
                  <li
                    key={task.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded border-2 ${
                      task.isAutoGenerated
                        ? 'bg-[var(--color-sky)]/30 border-[var(--color-lavender)]'
                        : 'bg-[var(--color-cream)] border-[var(--color-brown)]'
                    }`}
                  >
                    <span className="italic truncate flex-1">{task.title}</span>
                    <span className="text-xs text-[var(--color-brown)]">
                      {task.dueDate} · {task.estimatedMinutes} min
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingTaskId(task.id)}
                      className="shrink-0 p-1 rounded hover:bg-[var(--color-beige)]"
                      aria-label="Edit task"
                    >
                      <img
                        src="/sprites/icon-edit.svg"
                        alt=""
                        width="20"
                        height="20"
                      />
                    </button>
                  </li>
                ))}
                {allTasksSorted.length === 0 && (
                  <li className="text-[var(--color-brown)] text-sm">
                    No tasks yet. Add one above.
                  </li>
                )}
              </ul>
            </>
          )}

          {manageTab === 'tests' && (
            <div className="space-y-4">
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handlePdfSelect}
                aria-label="Select PDF"
              />
              <PixelButton
                label="Add Test (upload PDF)"
                variant="primary"
                onClick={() => pdfInputRef.current?.click()}
                disabled={quizLoading}
              />
              {quizLoading && (
                <p className="text-[var(--color-brown)] text-sm">Generating quiz…</p>
              )}
              {quizError && (
                <p className="text-[var(--color-casino-red)] text-sm">{quizError}</p>
              )}
              <hr className="border-[var(--color-brown)]" />
              <PixelButton
                label="Generate Schedule"
                variant="secondary"
                onClick={handleGenerateSchedule}
                disabled={scheduleLoading}
              />
              {scheduleLoading && (
                <p className="text-[var(--color-brown)] text-sm">Generating schedule…</p>
              )}
              {scheduleError && (
                <p className="text-[var(--color-casino-red)] text-sm">{scheduleError}</p>
              )}
              {weekData.length > 0 && (
                <div className="mt-4">
                  <p className="font-pixel text-[10px] text-[var(--color-dark-brown)] mb-2">
                    Weekly schedule (linked to plan)
                  </p>
                  <div className="rounded border-2 border-[var(--color-brown)] overflow-hidden">
                    {weekData.slice(0, 7).map(({ date, tasks: dayTasks }, index) => (
                      <div
                        key={date}
                        className="flex items-center gap-2 p-2 border-b border-[var(--color-brown)] last:border-b-0 bg-[var(--color-cream)]"
                      >
                        <span className="font-pixel text-[8px] w-12">
                          Day {index + 1}
                        </span>
                        <span className="font-body text-xs sm:text-sm">
                          {dayTasks.length > 0
                            ? dayTasks.map((t) => t.title).join(', ')
                            : '—'}
                        </span>
                        <span className="ml-auto font-pixel text-[8px] text-[var(--color-brown)]">
                          {formatDayLabel(date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {editingTask && (
            <Modal
              isOpen={!!editingTaskId}
              onClose={() => setEditingTaskId(null)}
              title="Edit task"
            >
              <div className="space-y-4">
                <div>
                  <label className="block font-body text-sm mb-1">Title</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) =>
                      editTask(editingTask.id, { title: e.target.value })
                    }
                    className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded font-body"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm mb-1">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={editingTask.dueDate}
                    onChange={(e) =>
                      editTask(editingTask.id, { dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded font-body"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm mb-1">
                    Estimated minutes
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingTask.estimatedMinutes}
                    onChange={(e) =>
                      editTask(editingTask.id, {
                        estimatedMinutes: Number(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded font-body"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PixelButton
                    label="Mark complete"
                    variant="primary"
                    onClick={() => {
                      markComplete(editingTask.id);
                      setEditingTaskId(null);
                    }}
                  />
                  <PixelButton
                    label="Cancel task"
                    variant="danger"
                    onClick={() => {
                      cancelTask(editingTask.id);
                      setEditingTaskId(null);
                    }}
                  />
                  <PixelButton
                    label="Close"
                    variant="ghost"
                    onClick={() => setEditingTaskId(null)}
                  />
                </div>
              </div>
            </Modal>
          )}
        </div>
      </Modal>
    </div>
  );
}
