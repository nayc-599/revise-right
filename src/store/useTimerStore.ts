import { create } from 'zustand';
import { useTaskStore } from './useTaskStore';

interface TimerStore {
  activeTaskId: string | null;
  elapsedSeconds: number;
  isPaused: boolean;
  estimatedMinutes: number;
  startTimer: (taskId: string, estimatedMinutes: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  clearTimer: () => void;
  addTime: (minutes: number) => void;
  tick: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  activeTaskId: null,
  elapsedSeconds: 0,
  isPaused: false,
  estimatedMinutes: 0,

  startTimer: (taskId, estimatedMinutes) =>
    set({
      activeTaskId: taskId,
      elapsedSeconds: 0,
      isPaused: false,
      estimatedMinutes,
    }),

  pauseTimer: () => set({ isPaused: true }),

  resumeTimer: () => set({ isPaused: false }),

  stopTimer: () => {
    const { activeTaskId, elapsedSeconds } = get();
    if (activeTaskId) {
      const actualMinutes = Math.round(elapsedSeconds / 60);
      useTaskStore.getState().editTask(activeTaskId, {
        actualMinutes,
        status: 'complete',
      });
    }
    set({ activeTaskId: null, elapsedSeconds: 0, isPaused: false });
  },

  /** Stop timer without marking task complete (e.g. "Stop task without completing"). */
  clearTimer: () => set({ activeTaskId: null, elapsedSeconds: 0, isPaused: false }),

  addTime: (minutes) =>
    set((state) => ({
      estimatedMinutes: state.estimatedMinutes + minutes,
    })),

  tick: () =>
    set((state) => {
      if (!state.activeTaskId || state.isPaused) return state;
      return { elapsedSeconds: state.elapsedSeconds + 1 };
    }),
}));
