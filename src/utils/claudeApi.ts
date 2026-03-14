import type { QuizQuestion } from '../types';

/**
 * Call serverless function to generate quiz. Never call Anthropic from client.
 */
export async function generateQuiz(
  topicName: string,
  notes: string,
  numQuestions: number
): Promise<QuizQuestion[]> {
  if (!notes.trim()) {
    throw new Error('Add notes before generating a quiz.');
  }
  const base = import.meta.env.VITE_APP_API_URL ?? '';
  const res = await fetch(`${base}/api/generateQuiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, notes, numQuestions }),
  });
  if (!res.ok) throw new Error('Quiz generation failed');
  return res.json();
}
