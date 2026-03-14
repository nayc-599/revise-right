/**
 * Central API client. Base URL from env; all backend calls go through here.
 */

const BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:8000';

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

export async function quizGenerate(pdfFile: File): Promise<QuizQuestion[]> {
  const form = new FormData();
  form.append('pdf_file', pdfFile);
  const res = await fetch(`${BASE}/api/quiz/generate`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? 'Quiz generation failed');
  }
  return res.json();
}

export type QuizScorePayload = {
  user_id: string;
  topic: string;
  score: number;
  total: number;
  timestamp: string;
};

export async function quizScore(payload: QuizScorePayload): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/api/quiz/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save score');
  return res.json();
}

export type SchedulerTopicInput = {
  name: string;
  difficulty: number;
  confidence: number;
  quiz_score: number;
  days_since_last_study: number;
  duration_hours: number;
};

export type SchedulerGeneratePayload = {
  topics: SchedulerTopicInput[];
  available_hours_per_day?: number;
  clone_count?: number;
  time_skip?: number;
};

export type SchedulerResponse = {
  schedule: Record<string, number[]>;
  tasks: { id: number; name: string; duration_hours: number }[];
};

export async function schedulerGenerate(payload: SchedulerGeneratePayload): Promise<SchedulerResponse> {
  const res = await fetch(`${BASE}/api/scheduler/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? 'Schedule generation failed');
  }
  return res.json();
}

export async function schedulerGetSchedule(userId: string): Promise<{
  schedule: Record<string, number[]>;
  tasks: { id: number; name: string; duration_hours: number }[];
  created_at: string | null;
}> {
  const res = await fetch(`${BASE}/api/scheduler/schedule/${encodeURIComponent(userId)}`);
  if (!res.ok) return { schedule: {}, tasks: [], created_at: null };
  return res.json();
}

export async function schedulerSaveSchedule(
  userId: string,
  payload: { schedule: Record<string, number[]>; tasks: { id: number; name: string; duration_hours: number }[] }
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/api/scheduler/schedule/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save schedule');
  return res.json();
}
