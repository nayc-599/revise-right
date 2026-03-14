/**
 * Hook for timer logic. Ticks every second when active and not paused.
 * Wires useTimerStore to a setInterval.
 */
import { useEffect } from 'react';
import { useTimerStore } from '../store/useTimerStore';

export function useTimer(): void {
  const { activeTaskId, isPaused, tick } = useTimerStore();

  useEffect(() => {
    if (!activeTaskId || isPaused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTaskId, isPaused, tick]);
}
