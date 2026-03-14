import { create } from 'zustand';
import type { QuizQuestion } from '../api';

interface QuizStore {
  questions: QuizQuestion[];
  topic: string;
  currentIndex: number;
  score: number;
  answered: boolean;
  selectedOption: string | null;
  isCorrect: boolean | null;
  setQuiz: (questions: QuizQuestion[], topic: string) => void;
  submitAnswer: (option: string) => void;
  advance: () => void;
  reset: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  topic: '',
  currentIndex: 0,
  score: 0,
  answered: false,
  selectedOption: null,
  isCorrect: null,

  setQuiz: (questions, topic) =>
    set({
      questions,
      topic,
      currentIndex: 0,
      score: 0,
      answered: false,
      selectedOption: null,
      isCorrect: null,
    }),

  submitAnswer: (option) => {
    const { questions, currentIndex, score } = get();
    const q = questions[currentIndex];
    if (!q || get().answered) return;
    const correct = q.answer.toUpperCase() === option.toUpperCase().trim().slice(0, 1);
    set({
      answered: true,
      selectedOption: option,
      isCorrect: correct,
      score: correct ? score + 1 : score,
    });
  },

  advance: () =>
    set((s) => ({
      currentIndex: s.currentIndex + 1,
      answered: false,
      selectedOption: null,
      isCorrect: null,
    })),

  reset: () =>
    set({
      questions: [],
      topic: '',
      currentIndex: 0,
      score: 0,
      answered: false,
      selectedOption: null,
      isCorrect: null,
    }),
}));
