/**
 * Tracks whether the user has started the day (clicked Start day + confirmed)
 * and whether they have ended the day (Goodnight flow complete).
 * Dates are ISO YYYY-MM-DD; used to show correct home state and night mode.
 */
import { create } from 'zustand';

interface DayStore {
  /** Date when user clicked Confirm on week plan (started day). */
  startedDate: string | null;
  /** Date when user completed Goodnight (ended day). Summary shows until next day. */
  endedDate: string | null;
  /** Whether the week-plan / edit-tasks view is open (modal or inline). */
  showWeekPlan: boolean;
  /** 'start' = opened from Start day (Confirm goes to game choice); 'edit' = opened from Edit this week's tasks. */
  weekPlanMode: 'start' | 'edit';
  setStartedDate: (date: string | null) => void;
  setEndedDate: (date: string | null) => void;
  setShowWeekPlan: (show: boolean) => void;
  setWeekPlanMode: (mode: 'start' | 'edit') => void;
}

export const useDayStore = create<DayStore>((set) => ({
  startedDate: null,
  endedDate: null,
  showWeekPlan: false,
  weekPlanMode: 'start',

  setStartedDate: (startedDate) => set({ startedDate }),
  setEndedDate: (endedDate) => set({ endedDate }),
  setShowWeekPlan: (showWeekPlan) => set({ showWeekPlan }),
  setWeekPlanMode: (weekPlanMode) => set({ weekPlanMode }),
}));
