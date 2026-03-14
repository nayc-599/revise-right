import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseApp } from './config';
import type { Task, Test, DayReport } from '../types';

const getDb = () => getFirestore(getFirebaseApp());

/**
 * Get tasks collection ref for a user. All reads/writes must be scoped to userId.
 */
export function tasksCollection(userId: string) {
  return collection(getDb(), 'users', userId, 'tasks');
}

/**
 * Get a single task doc ref.
 */
export function taskDoc(userId: string, taskId: string) {
  return doc(getDb(), 'users', userId, 'tasks', taskId);
}

/**
 * Get tests collection ref for a user.
 */
export function testsCollection(userId: string) {
  return collection(getDb(), 'users', userId, 'tests');
}

/**
 * Get a single test doc ref.
 */
export function testDoc(userId: string, testId: string) {
  return doc(getDb(), 'users', userId, 'tests', testId);
}

/**
 * Get day reports collection ref for a user. Keyed by ISO date.
 */
export function dayReportsCollection(userId: string) {
  return collection(getDb(), 'users', userId, 'dayReports');
}

/**
 * Get a single day report doc ref (document id = date string).
 */
export function dayReportDoc(userId: string, date: string) {
  return doc(getDb(), 'users', userId, 'dayReports', date);
}

/**
 * Subscribe to real-time task list updates for a user.
 */
export function subscribeToTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void
): () => void {
  const q = collection(getDb(), 'users', userId, 'tasks');
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Task[];
      onUpdate(tasks);
    },
    (error) => {
      console.error('Firestore tasks subscription error:', error);
      onUpdate([]);
    }
  );
}

/**
 * Save or update a task. Uses userId from the task.
 */
export async function saveTask(task: Task): Promise<void> {
  try {
    const ref = taskDoc(task.userId, task.id);
    await setDoc(ref, task);
  } catch (e) {
    console.error('saveTask error:', e);
    throw e;
  }
}

/**
 * Delete a task.
 */
export async function deleteTask(userId: string, taskId: string): Promise<void> {
  try {
    await deleteDoc(taskDoc(userId, taskId));
  } catch (e) {
    console.error('deleteTask error:', e);
    throw e;
  }
}

/**
 * Save or update a test.
 */
export async function saveTest(test: Test): Promise<void> {
  try {
    const ref = testDoc(test.userId, test.id);
    await setDoc(ref, test);
  } catch (e) {
    console.error('saveTest error:', e);
    throw e;
  }
}

/**
 * Save or update a day report. Document id = date.
 */
export async function saveDayReport(report: DayReport): Promise<void> {
  try {
    const ref = dayReportDoc(report.userId, report.date);
    await setDoc(ref, report);
  } catch (e) {
    console.error('saveDayReport error:', e);
    throw e;
  }
}
