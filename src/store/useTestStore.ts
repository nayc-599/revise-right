import { create } from 'zustand';
import type { Test, Topic, QuizAttempt, ScheduledSession } from '../types';

interface TestStore {
  tests: Test[];
  addTest: (test: Test) => void;
  editTest: (id: string, updates: Partial<Test>) => void;
  deleteTest: (id: string) => void;
  addTopic: (testId: string, topic: Topic) => void;
  editTopic: (testId: string, topicId: string, updates: Partial<Topic>) => void;
  removeTopic: (testId: string, topicId: string) => void;
  saveQuizAttempt: (
    testId: string,
    topicId: string,
    attempt: QuizAttempt
  ) => void;
  regenerateSchedule: (
    testId: string,
    topicId: string,
    schedule: ScheduledSession[]
  ) => void;
}

export const useTestStore = create<TestStore>((set) => ({
  tests: [],

  addTest: (test) =>
    set((state) => ({ tests: [...state.tests, test] })),

  editTest: (id, updates) =>
    set((state) => ({
      tests: state.tests.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  deleteTest: (id) =>
    set((state) => ({ tests: state.tests.filter((t) => t.id !== id) })),

  addTopic: (testId, topic) =>
    set((state) => ({
      tests: state.tests.map((t) =>
        t.id === testId
          ? { ...t, topics: [...(t.topics ?? []), topic] }
          : t
      ),
    })),

  editTopic: (testId, topicId, updates) =>
    set((state) => ({
      tests: state.tests.map((t) =>
        t.id === testId
          ? {
              ...t,
              topics: (t.topics ?? []).map((top) =>
                top.id === topicId ? { ...top, ...updates } : top
              ),
            }
          : t
      ),
    })),

  removeTopic: (testId, topicId) =>
    set((state) => ({
      tests: state.tests.map((t) =>
        t.id === testId
          ? { ...t, topics: (t.topics ?? []).filter((top) => top.id !== topicId) }
          : t
      ),
    })),

  saveQuizAttempt: (testId, topicId, attempt) =>
    set((state) => ({
      tests: state.tests.map((t) =>
        t.id === testId
          ? {
              ...t,
              topics: (t.topics ?? []).map((top) =>
                top.id === topicId
                  ? {
                      ...top,
                      quizHistory: [...(top.quizHistory ?? []), attempt],
                    }
                  : top
              ),
            }
          : t
      ),
    })),

  regenerateSchedule: (testId, topicId, schedule) =>
    set((state) => ({
      tests: state.tests.map((t) =>
        t.id === testId
          ? {
              ...t,
              revisionSchedule: [
                ...(t.revisionSchedule ?? []).filter(
                  (s) => s.topicId !== topicId
                ),
                ...schedule,
              ],
            }
          : t
      ),
    })),
}));
