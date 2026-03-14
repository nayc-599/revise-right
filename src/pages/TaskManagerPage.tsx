import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '../components/shared/PixelButton';
import { Modal } from '../components/shared/Modal';
import { useTaskStore } from '../store/useTaskStore';
import { useTestStore } from '../store/useTestStore';
import { LOCAL_USER_ID } from '../store/useUserStore';
import type { Task, Test, Topic } from '../types';

type MainTab = 'tasks' | 'tests';

type DetailTab =
  | { kind: 'edit-task'; label: string; taskId: string }
  | { kind: 'new-task'; label: 'New Task' }
  | { kind: 'new-test'; label: 'New Test' }
  | { kind: 'revision-plan'; label: string; testId: string }
  | { kind: 'edit-topic'; label: string; testId: string; topicId: string }
  | { kind: 'new-topic'; label: 'Add Topic'; testId: string }
  | { kind: 'edit-test'; label: string; testId: string };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(isoDate: string): string {
  const today = todayISO();
  const d = new Date(isoDate + 'T12:00:00');
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-GB', { month: 'long' });
  const bracketed = formatDateDDMMYYYY(isoDate);
  if (isoDate === today) return `Today (${bracketed})`;
  return `${weekday} ${day} ${month} (${bracketed})`;
}

function formatDateDDMMYYYY(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}-${m}-${y}`;
}

function isOverdue(task: Task, today: string): boolean {
  return task.status !== 'complete' && task.status !== 'cancelled' && task.dueDate < today;
}

async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${file.type || 'application/pdf'};base64,${btoa(binary)}`;
}

export function TaskManagerPage() {
  const navigate = useNavigate();
  const today = todayISO();

  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const editTask = useTaskStore((s) => s.editTask);
  const cancelTask = useTaskStore((s) => s.cancelTask);
  const markComplete = useTaskStore((s) => s.markComplete);

  const tests = useTestStore((s) => s.tests);
  const addTest = useTestStore((s) => s.addTest);
  const editTest = useTestStore((s) => s.editTest);
  const addTopic = useTestStore((s) => s.addTopic);
  const editTopic = useTestStore((s) => s.editTopic);

  const [mainTab, setMainTab] = useState<MainTab>('tasks');

  const [detailTab, setDetailTab] = useState<DetailTab | null>(null);

  const openDetail = (tab: DetailTab) => {
    setDetailTab(tab);
  };

  const closeDetail = () => {
    setDetailTab(null);
  };

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState(30);
  const [newTaskDueDate, setNewTaskDueDate] = useState(today);
  const [newTaskError, setNewTaskError] = useState<string | null>(null);

  const [newTestName, setNewTestName] = useState('');
  const [newTestDate, setNewTestDate] = useState(today);
  const [newTestTime, setNewTestTime] = useState('09:00');
  const [newTestError, setNewTestError] = useState<string | null>(null);

  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});

  const [addTopicOpenForTestId, setAddTopicOpenForTestId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicPdf, setNewTopicPdf] = useState<File | null>(null);
  const [newTopicConfidence, setNewTopicConfidence] = useState(1);
  const [savingTopic, setSavingTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const resetNewTopicForm = () => {
    setNewTopicName('');
    setNewTopicPdf(null);
    setNewTopicConfidence(1);
    setTopicError(null);
  };

  const visibleTasks = useMemo(
    () =>
      tasks.filter((t) => t.status !== 'cancelled' && t.status !== 'complete'),
    [tasks]
  );

  const taskGroups = useMemo(() => {
    const map = new Map<string, Task[]>();
    visibleTasks.forEach((t) => {
      const effectiveDate = isOverdue(t, today) ? today : t.dueDate;
      const arr = map.get(effectiveDate) ?? [];
      arr.push(t);
      map.set(effectiveDate, arr);
    });
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
    return keys.map((date) => ({
      date,
      tasks: (map.get(date) ?? []).sort(
        (a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt)
      ),
    }));
  }, [visibleTasks, today]);

  const sortedTests = useMemo(() => {
    return [...tests].sort((a, b) => {
      const aKey = `${a.testDate}T${a.testTime ?? '00:00'}`;
      const bKey = `${b.testDate}T${b.testTime ?? '00:00'}`;
      return aKey.localeCompare(bKey) || a.createdAt.localeCompare(b.createdAt);
    });
  }, [tests]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    if (newTaskMinutes <= 0) {
      setNewTaskError('Please enter at least 1 minute.');
      return;
    }
    const exists = tasks.some(
      (t) =>
        t.status !== 'complete' &&
        t.title.trim().toLowerCase() === newTaskTitle.trim().toLowerCase()
    );
    if (exists) {
      setNewTaskError('Task name must be unique.');
      return;
    }
    setNewTaskError(null);
    const task: Task = {
      id: crypto.randomUUID(),
      userId: LOCAL_USER_ID,
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate,
      estimatedMinutes: newTaskMinutes,
      actualMinutes: 0,
      status: 'pending',
      requiresTaskIds: [],
      isAutoGenerated: false,
      createdAt: new Date().toISOString(),
    };
    addTask(task);
    setNewTaskTitle('');
    setNewTaskMinutes(30);
    setNewTaskDueDate(today);
    setNewTaskError(null);
    closeDetail();
  };

  const handleAddTest = () => {
    if (!newTestName.trim()) return;
    const todayIso = todayISO();
    const exists = tests.some(
      (t) =>
        t.testDate >= todayIso &&
        t.name.trim().toLowerCase() === newTestName.trim().toLowerCase()
    );
    if (exists) {
      setNewTestError('Test name must be unique among future tests.');
      return;
    }
    setNewTestError(null);
    const test: Test = {
      id: crypto.randomUUID(),
      userId: LOCAL_USER_ID,
      name: newTestName.trim(),
      testDate: newTestDate,
      testTime: newTestTime,
      topics: [],
      revisionSchedule: [],
      createdAt: new Date().toISOString(),
    };
    addTest(test);
    setNewTestName('');
    setNewTestDate(today);
    setNewTestTime('09:00');
    setNewTestError(null);
    closeDetail();
  };

  const handleSaveTopic = async () => {
    const testId =
      detailTab?.kind === 'new-topic' ? detailTab.testId : addTopicOpenForTestId;
    if (!testId) return;
    if (!newTopicName.trim()) return;
    if (newTopicPdf && !newTopicPdf.name.toLowerCase().endsWith('.pdf')) {
      setTopicError('Summary must be a PDF if provided.');
      return;
    }
    const test = tests.find((t) => t.id === testId);
    if (test) {
      const exists = (test.topics ?? []).some(
        (t) => t.name.trim().toLowerCase() === newTopicName.trim().toLowerCase()
      );
      if (exists) {
        setTopicError('Topic name must be unique within this test.');
        return;
      }
    }
    setTopicError(null);
    setSavingTopic(true);
    try {
      let summaryPdf: { name: string; dataUrl: string } | undefined;
      if (newTopicPdf) {
        const dataUrl = await fileToDataUrl(newTopicPdf);
        summaryPdf = { name: newTopicPdf.name, dataUrl };
      }
      const topic: Topic = {
        id: crypto.randomUUID(),
        name: newTopicName.trim(),
        notes: '',
        confidenceRating: Math.min(10, Math.max(1, newTopicConfidence)),
        summaryPdf,
        quizHistory: [],
      };
      addTopic(testId, topic);
      setNewTopicName('');
      setNewTopicPdf(null);
      setNewTopicConfidence(1);
      setAddTopicOpenForTestId(null);
      closeDetail();
    } finally {
      setSavingTopic(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-cream)] text-[var(--color-dark-brown)] font-body">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
          <div>
            <h2 className="font-pixel text-sm sm:text-base">Add / Manage</h2>
            <p className="text-sm text-[var(--color-brown)]">
              Tasks and tests live here.
            </p>
          </div>
          <PixelButton label="Back to home" variant="ghost" onClick={() => navigate('/')} />
        </div>

        {/* Row with top margin so tabs clear subtitle; both columns stretch so bottoms align */}
        <div className="flex gap-4 flex-1 min-h-0 items-stretch mt-14">
          {/* Left “folder” — fixed height (fills row, same as details panel); tabs attached to top of box */}
          <div className="relative w-[55%] max-w-xl flex-none h-full min-h-0">
            <div className="relative h-full flex flex-col min-h-0 bg-[var(--color-beige)] border-4 border-[var(--color-brown)] rounded-lg shadow-[6px_6px_0_var(--color-pixel-shadow)]">
              {/* Folder tabs — attached to top of box */}
              <div className="absolute left-4 flex gap-2 bottom-full">
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('tasks');
                    closeDetail();
                  }}
                  className={`px-4 py-2 border-4 border-[var(--color-brown)] rounded-t-lg font-pixel text-[10px] shadow-[3px_3px_0_var(--color-pixel-shadow)] ${
                    mainTab === 'tasks'
                      ? 'bg-[var(--color-gold)]'
                      : 'bg-[var(--color-cream)] hover:brightness-105'
                  }`}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('tests');
                    closeDetail();
                  }}
                  className={`px-4 py-2 border-4 border-[var(--color-brown)] rounded-t-lg font-pixel text-[10px] shadow-[3px_3px_0_var(--color-pixel-shadow)] ${
                    mainTab === 'tests'
                      ? 'bg-[var(--color-gold)]'
                      : 'bg-[var(--color-cream)] hover:brightness-105'
                  }`}
                >
                  Tests
                </button>
              </div>

              <div className="pt-10 p-5 flex-1 min-h-0">
                {mainTab === 'tasks' && (
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex items-center gap-3">
                      <PixelButton
                        label="+ Add task"
                        variant="primary"
                        onClick={() => {
                          setNewTaskError(null);
                          openDetail({ kind: 'new-task', label: 'New Task' });
                        }}
                      />
                      <p className="text-sm text-[var(--color-brown)]">
                        Tasks are grouped by due date (overdue tasks appear under Today).
                      </p>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-5">
                      {taskGroups.length === 0 ? (
                        <div className="text-sm text-[var(--color-brown)]">
                          No active tasks. Add one above.
                        </div>
                      ) : (
                        taskGroups.map((group) => (
                          <div key={group.date} className="space-y-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="font-pixel text-[10px] text-[var(--color-dark-brown)]">
                                {formatDateLabel(group.date)}
                              </div>
                            </div>
                            <ul className="space-y-2">
                              {group.tasks.map((task) => (
                                <li
                                  key={task.id}
                                  className={`p-3 rounded border-2 flex items-center justify-between gap-3 ${
                                    task.isAutoGenerated
                                      ? 'bg-[var(--color-sky)]/25 border-[var(--color-lavender)]'
                                      : 'bg-[var(--color-cream)] border-[var(--color-brown)]'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="italic truncate">{task.title}</span>
                                      {isOverdue(task, today) && (
                                        <span className="font-pixel text-[9px] text-[var(--color-casino-red)]">
                                          past due
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-[var(--color-brown)]">
                                      Due {formatDateDDMMYYYY(task.dueDate)} · {task.estimatedMinutes} min
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openDetail({
                                        kind: 'edit-task',
                                        label: 'Edit Task',
                                        taskId: task.id,
                                      })
                                    }
                                    className="shrink-0 p-2 rounded hover:bg-[var(--color-beige)] border-2 border-[var(--color-brown)]"
                                    aria-label="Edit task"
                                  >
                                    <img src="/sprites/icon-edit.svg" alt="" width="18" height="18" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {mainTab === 'tests' && (
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex items-center gap-3">
                      <PixelButton
                        label="+ Add test"
                        variant="primary"
                        onClick={() => {
                          setNewTestError(null);
                          openDetail({ kind: 'new-test', label: 'New Test' });
                        }}
                      />
                      <p className="text-sm text-[var(--color-brown)]">
                        Add a test, then expand it to add topics.
                      </p>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto pr-1">
                      {sortedTests.length === 0 ? (
                        <div className="text-sm text-[var(--color-brown)]">
                          No tests yet. Add one above.
                        </div>
                      ) : (
                        <div className="rounded border-2 border-[var(--color-brown)] overflow-hidden">
                          {sortedTests.map((test) => {
                            const expanded = !!expandedTestIds[test.id];
                            return (
                              <div key={test.id} className="border-b border-[var(--color-brown)] last:border-b-0">
                                <div className="bg-[var(--color-cream)] p-3 flex items-center gap-3 flex-wrap">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-body font-semibold truncate">{test.name}</div>
                                    <div className="text-xs text-[var(--color-brown)]">
                                      {formatDateDDMMYYYY(test.testDate)}
                                      {test.testTime ? ` · ${test.testTime}` : ''}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openDetail({
                                          kind: 'edit-test',
                                          label: 'Edit Test',
                                          testId: test.id,
                                        })
                                      }
                                      className="px-3 py-1 border-2 border-[var(--color-brown)] rounded bg-[var(--color-beige)] font-pixel text-[9px] hover:brightness-105"
                                    >
                                      Edit test
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openDetail({
                                          kind: 'revision-plan',
                                          label: 'Revision Plan',
                                          testId: test.id,
                                        })
                                      }
                                      className="px-3 py-1 border-2 border-[var(--color-brown)] rounded bg-[var(--color-beige)] font-pixel text-[9px] hover:brightness-105"
                                    >
                                      Revision plan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedTestIds((prev) => ({
                                          ...prev,
                                          [test.id]: !prev[test.id],
                                        }))
                                      }
                                      className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--color-brown)] rounded bg-[var(--color-gold)] hover:brightness-105 shrink-0"
                                      aria-label={expanded ? 'Collapse' : 'Expand'}
                                    >
                                      {expanded ? '▼' : '▶'}
                                    </button>
                                  </div>
                                </div>

                                {expanded && (
                                  <div className="bg-[var(--color-beige)] p-3 border-t border-[var(--color-brown)] space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="font-pixel text-[10px] text-[var(--color-dark-brown)]">
                                        Topics
                                      </div>
                                      <PixelButton
                                        label="+ Add topic"
                                        variant="primary"
                                        onClick={() => {
                                          resetNewTopicForm();
                                          openDetail({
                                            kind: 'new-topic',
                                            label: 'Add Topic',
                                            testId: test.id,
                                          });
                                        }}
                                      />
                                    </div>

                                    <ul className="space-y-2">
                                      {(test.topics ?? []).length === 0 ? (
                                        <li className="text-sm text-[var(--color-brown)]">
                                          No topics yet.
                                        </li>
                                      ) : (
                                        (test.topics ?? []).map((topic) => (
                                          <li
                                            key={topic.id}
                                            className="p-3 rounded border-2 border-[var(--color-brown)] bg-[var(--color-cream)] flex items-center justify-between gap-3"
                                          >
                                            <div className="min-w-0">
                                              <div className="font-body font-semibold truncate">
                                                {topic.name}
                                              </div>
                                              <div className="text-xs text-[var(--color-brown)]">
                                                Confidence:{' '}
                                                {topic.confidenceRating ?? '—'}/10
                                                {topic.summaryPdf?.name ? ` · ${topic.summaryPdf.name}` : ''}
                                              </div>
                                            </div>
                                            <PixelButton
                                              label="Edit"
                                              variant="secondary"
                                              onClick={() =>
                                                openDetail({
                                                  kind: 'edit-topic',
                                                  label: 'Edit Topic',
                                                  testId: test.id,
                                                  topicId: topic.id,
                                                })
                                              }
                                            />
                                          </li>
                                        ))
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sub-tab area (≈ 1/3) */}
          {detailTab && (
            <div className="w-1/3 h-full">
              <div className="h-full bg-[var(--color-cream)] border-4 border-[var(--color-brown)] rounded-lg shadow-[6px_6px_0_var(--color-pixel-shadow)] flex flex-col overflow-hidden">
                <div className="border-b-2 border-[var(--color-brown)] bg-[var(--color-beige)] px-3 py-2 flex items-center justify-between gap-2">
                  <div className="font-pixel text-[10px] truncate">
                    {detailTab.label}
                  </div>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="font-pixel text-xs text-[var(--color-brown)] hover:text-[var(--color-dark-brown)]"
                    aria-label="Close details"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 flex-1 min-h-0 overflow-auto">
                  {detailTab.kind === 'new-task' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-1">Task name</label>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Estimated minutes</label>
                        <input
                          type="number"
                          min={0}
                          value={newTaskMinutes === 0 ? '' : newTaskMinutes}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNewTaskMinutes(v === '' ? 0 : Math.max(0, Number(v) || 0));
                          }}
                          className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Due date</label>
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                        />
                      </div>
                      {newTaskError && (
                        <div className="text-sm text-[var(--color-casino-red)]">{newTaskError}</div>
                      )}
                      <PixelButton
                        label="Add task"
                        variant="primary"
                        onClick={handleAddTask}
                        disabled={!newTaskTitle.trim() || newTaskMinutes <= 0}
                      />
                    </div>
                  )}

                  {detailTab.kind === 'new-test' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-1">Test name</label>
                        <input
                          type="text"
                          value={newTestName}
                          onChange={(e) => setNewTestName(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Test date</label>
                          <input
                            type="date"
                            value={newTestDate}
                            onChange={(e) => setNewTestDate(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Test time</label>
                          <input
                            type="time"
                            value={newTestTime}
                            onChange={(e) => setNewTestTime(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                          />
                        </div>
                      </div>
                      {newTestError && (
                        <div className="text-sm text-[var(--color-casino-red)]">{newTestError}</div>
                      )}
                      <PixelButton
                        label="Add test"
                        variant="primary"
                        onClick={handleAddTest}
                        disabled={!newTestName.trim()}
                      />
                    </div>
                  )}

                  {detailTab.kind === 'new-topic' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-1">Topic name</label>
                        <input
                          type="text"
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">
                          PDF summary attachment <span className="text-[var(--color-brown)]">(optional)</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = '';
                            setNewTopicPdf(f);
                          }}
                        />
                        {newTopicPdf?.name && (
                          <div className="text-xs text-[var(--color-brown)] mt-1">Selected: {newTopicPdf.name}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Confidence: {newTopicConfidence}/10</label>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={newTopicConfidence}
                          onChange={(e) => setNewTopicConfidence(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      {topicError && (
                        <div className="text-sm text-[var(--color-casino-red)]">{topicError}</div>
                      )}
                      <PixelButton
                        label="Save & Generate study schedule"
                        variant="primary"
                        onClick={handleSaveTopic}
                        disabled={!newTopicName.trim() || savingTopic}
                      />
                    </div>
                  )}

                  {detailTab.kind === 'edit-task' && (() => {
                    const task = tasks.find((t) => t.id === detailTab.taskId) ?? null;
                    if (!task) {
                      return (
                        <div className="text-sm text-[var(--color-brown)]">
                          Task not found.
                        </div>
                      );
                    }
                    const overdue = isOverdue(task, today);
                    return (
                      <div className="space-y-4">
                        {overdue && (
                          <div className="font-pixel text-[9px] text-[var(--color-casino-red)]">
                            past due (locked in schedule)
                          </div>
                        )}
                        <div>
                          <label className="block text-sm mb-1">Title</label>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => editTask(task.id, { title: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Due date</label>
                          <input
                            type="date"
                            value={task.dueDate}
                            onChange={(e) => editTask(task.id, { dueDate: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Estimated minutes</label>
                          <input
                            type="number"
                            min={1}
                            value={task.estimatedMinutes}
                            onChange={(e) =>
                              editTask(task.id, { estimatedMinutes: Number(e.target.value) || 30 })
                            }
                            className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <PixelButton
                            label="Mark complete"
                            variant="primary"
                            onClick={() => {
                              markComplete(task.id);
                              closeDetail();
                            }}
                          />
                          <PixelButton
                            label="Cancel Task"
                            variant="danger"
                            onClick={() => {
                              cancelTask(task.id);
                              closeDetail();
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {detailTab.kind === 'revision-plan' && (() => {
                    const test = tests.find((t) => t.id === detailTab.testId) ?? null;
                    if (!test) {
                      return <div className="text-sm text-[var(--color-brown)]">Test not found.</div>;
                    }
                    return (
                      <div className="space-y-3">
                        {(test.revisionSchedule ?? []).length === 0 ? (
                          <div className="text-sm text-[var(--color-brown)]">
                            Add topics to create revision plan
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {(test.revisionSchedule ?? [])
                              .slice()
                              .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
                              .map((s) => (
                                <li
                                  key={s.id}
                                  className="p-3 rounded border-2 border-[var(--color-brown)] bg-[var(--color-beige)]"
                                >
                                  <div className="text-sm font-semibold">{s.scheduledDate}</div>
                                  <div className="text-xs text-[var(--color-brown)]">
                                    Topic: {s.topicId} · {s.durationMinutes} min · Review #{s.reviewNumber}
                                  </div>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()}

                  {detailTab.kind === 'edit-topic' && (() => {
                    const test = tests.find((t) => t.id === detailTab.testId) ?? null;
                    const topic = test?.topics?.find((tp) => tp.id === detailTab.topicId) ?? null;
                    if (!test || !topic) {
                      return <div className="text-sm text-[var(--color-brown)]">Topic not found.</div>;
                    }
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm mb-1">Topic name</label>
                          <input
                            type="text"
                            value={topic.name}
                            onChange={(e) => editTopic(test.id, topic.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">
                            Confidence: {topic.confidenceRating ?? 5}/10
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={topic.confidenceRating ?? 5}
                            onChange={(e) =>
                              editTopic(test.id, topic.id, {
                                confidenceRating: Number(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">PDF summary</label>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={async (e) => {
                              const f = e.target.files?.[0] ?? null;
                              e.target.value = '';
                              if (!f) return;
                              if (!f.name.toLowerCase().endsWith('.pdf')) return;
                              const dataUrl = await fileToDataUrl(f);
                              editTopic(test.id, topic.id, { summaryPdf: { name: f.name, dataUrl } });
                            }}
                          />
                          {topic.summaryPdf?.name && (
                            <div className="text-xs text-[var(--color-brown)] mt-1">
                              Attached: {topic.summaryPdf.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {detailTab.kind === 'edit-test' && (() => {
                    const test = tests.find((t) => t.id === detailTab.testId) ?? null;
                    if (!test) {
                      return <div className="text-sm text-[var(--color-brown)]">Test not found.</div>;
                    }
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm mb-1">Test name</label>
                          <input
                            type="text"
                            value={test.name}
                            onChange={(e) => editTest(test.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm mb-1">Test date</label>
                            <input
                              type="date"
                              value={test.testDate}
                              onChange={(e) => editTest(test.id, { testDate: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-1">Test time</label>
                            <input
                              type="time"
                              value={test.testTime ?? ''}
                              onChange={(e) => editTest(test.id, { testTime: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
