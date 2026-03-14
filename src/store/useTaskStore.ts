import { create } from 'zustand';
import type { Task, TaskStatus } from '../types';

interface TaskStore {
  tasks: Task[];
  addTask: (task: Task) => void;
  editTask: (id: string, updates: Partial<Task>) => void;
  cancelTask: (id: string) => void;
  markComplete: (id: string) => void;
  moveTaskToDate: (id: string, newDueDate: string) => void;
  getTodaysTasks: () => Task[];
  getTaskById: (id: string) => Task | undefined;
  getTasksForDate: (date: string) => Task[];
  getTasksForWeek: () => { date: string; tasks: Task[]; totalMinutes: number }[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const isPastDueIncomplete = (task: Task, today: string) =>
  task.status !== 'complete' &&
  task.status !== 'cancelled' &&
  task.dueDate < today;

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

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  editTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  cancelTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'cancelled' as TaskStatus } : t
      ),
    })),

  markComplete: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? { ...t, status: 'complete' as TaskStatus, completedAt: new Date().toISOString() }
          : t
      ),
    })),

  moveTaskToDate: (id, newDueDate) =>
    set((state) => {
      const today = todayISO();
      return {
        tasks: state.tasks.map((t) => {
          if (t.id !== id) return t;
          // Overdue incomplete tasks are locked in the schedule UI.
          if (isPastDueIncomplete(t, today)) return t;
          return { ...t, dueDate: newDueDate };
        }),
      };
    }),

  getTodaysTasks: () => {
    const today = todayISO();
    return get()
      .tasks.filter((t) => t.status !== 'cancelled')
      .filter((t) => (isPastDueIncomplete(t, today) ? today : t.dueDate) === today);
  },

  getTaskById: (id) => get().tasks.find((t) => t.id === id),

  getTasksForDate: (date) => {
    const today = todayISO();
    const tasks = get().tasks.filter((t) => t.status !== 'cancelled');
    if (date === today) {
      return tasks.filter(
        (t) => (isPastDueIncomplete(t, today) ? today : t.dueDate) === today
      );
    }
    return tasks.filter((t) => t.dueDate === date);
  },

  getTasksForWeek: () => {
    const today = todayISO();
    const tasks = get()
      .tasks.filter((t) => t.status !== 'cancelled' && t.status !== 'complete')
      .map((t) =>
        isPastDueIncomplete(t, today) ? { ...t, dueDate: today } : t
      );
    return getWeekDates().map((date) => {
      const dayTasks = tasks.filter((t) => t.dueDate === date);
      const totalMinutes = dayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
      return { date, tasks: dayTasks, totalMinutes };
    });
  },
}));
