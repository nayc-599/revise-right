import type { ConfidenceLevel, ScheduledSession } from '../types';

/**
 * Ebbinghaus-style review intervals. R = e^(-t/S).
 * Returns scheduled sessions for a topic up to test date.
 */
export function generateReviewSchedule(
  topicId: string,
  testDate: Date,
  confidence: ConfidenceLevel,
  startDate: Date = new Date()
): ScheduledSession[] {
  const sessions: ScheduledSession[] = [];
  const intervals = getIntervals(confidence);
  const durationMinutes = getDurationMinutes(confidence);
  let current = new Date(startDate);
  let reviewNumber = 1;

  for (const days of intervals) {
    current = new Date(current);
    current.setDate(current.getDate() + days);
    if (current > testDate) break;
    sessions.push({
      id: `${topicId}-${reviewNumber}`,
      topicId,
      scheduledDate: current.toISOString().slice(0, 10),
      durationMinutes,
      reviewNumber,
    });
    reviewNumber += 1;
  }

  return sessions;
}

function getIntervals(confidence: ConfidenceLevel): number[] {
  switch (confidence) {
    case 'low':
      return [1, 2, 4, 7, 12];
    case 'medium':
      return [1, 3, 7, 14];
    case 'high':
      return [2, 7, 14];
    default:
      return [1, 3, 7, 14];
  }
}

function getDurationMinutes(confidence: ConfidenceLevel): number {
  switch (confidence) {
    case 'low':
      return 60;
    case 'medium':
      return 45;
    case 'high':
      return 30;
    default:
      return 45;
  }
}
