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
        t.id === id ? { ...t, status: 'complete' as TaskStatus } : t
      ),
    })),

  moveTaskToDate: (id, newDueDate) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, dueDate: newDueDate } : t
      ),
    })),

  getTodaysTasks: () => {
    const today = todayISO();
    return get().tasks.filter(
      (t) => t.dueDate === today && t.status !== 'cancelled'
    );
  },

  getTaskById: (id) => get().tasks.find((t) => t.id === id),

  getTasksForDate: (date) =>
    get().tasks.filter(
      (t) => t.dueDate === date && t.status !== 'cancelled'
    ),

  getTasksForWeek: () => {
    const tasks = get().tasks.filter((t) => t.status !== 'cancelled');
    return getWeekDates().map((date) => {
      const dayTasks = tasks.filter((t) => t.dueDate === date);
      const totalMinutes = dayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
      return { date, tasks: dayTasks, totalMinutes };
    });
  },
}));
