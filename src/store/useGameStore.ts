import { create } from 'zustand';
import type { GameMode } from '../types';

interface GameStore {
  gameMode: GameMode | null;
  isGameActive: boolean;
  taskQueue: string[];
  currentTaskIndex: number;
  funTask: string | null;
  setGameMode: (mode: GameMode | null) => void;
  advanceTask: () => void;
  endGame: () => void;
  setTaskQueue: (taskIds: string[]) => void;
  setFunTask: (task: string | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameMode: null,
  isGameActive: false,
  taskQueue: [],
  currentTaskIndex: 0,
  funTask: null,

  setGameMode: (gameMode) => set({ gameMode }),

  advanceTask: () =>
    set((state) => ({
      currentTaskIndex: Math.min(
        state.currentTaskIndex + 1,
        state.taskQueue.length - 1
      ),
    })),

  endGame: () =>
    set({
      isGameActive: false,
      gameMode: null,
      taskQueue: [],
      currentTaskIndex: 0,
      funTask: null,
    }),

  setTaskQueue: (taskQueue) =>
    set({ taskQueue, currentTaskIndex: 0, isGameActive: true }),

  setFunTask: (funTask) => set({ funTask }),
}));
