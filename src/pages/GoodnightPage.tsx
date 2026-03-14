import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatSprite } from '../components/shared/CatSprite';
import { PixelButton } from '../components/shared/PixelButton';
import { useTaskStore } from '../store/useTaskStore';
import { useDayStore } from '../store/useDayStore';
import { exportDayReport } from '../utils/pdfExport';
import type { DayReport, GameMode } from '../types';
import { useGameStore } from '../store/useGameStore';

export function GoodnightPage() {
  const navigate = useNavigate();
  const setEndedDate = useDayStore((s) => s.setEndedDate);
  const tasks = useTaskStore((s) => s.tasks);
  const gameMode = useGameStore((s) => s.gameMode);
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = tasks.filter(
    (t) => t.dueDate === today && t.status === 'complete'
  );
  const [saved, setSaved] = useState(false);

  const report: DayReport = {
    date: today,
    userId: 'local',
    completedTaskIds: completedToday.map((t) => t.id),
    reflectionResponse: null,
    gameMode: (gameMode ?? 'shooting') as GameMode,
  };

  const handleSaveReport = () => {
    exportDayReport(report, tasks);
    setSaved(true);
  };

  return (
    <div className="font-body p-6 max-w-2xl mx-auto">
      <h2 className="font-pixel text-sm text-[var(--color-dark-brown)] mb-2">
        Goodnight
      </h2>
      <p className="text-[var(--color-brown)] text-sm mb-4">
        Say goodnight to your cats. Here&apos;s what you did today.
      </p>

      {/* Cat walk: list of tasks then bed */}
      <div className="space-y-4 mb-8">
        {completedToday.length === 0 ? (
          <p className="text-[var(--color-brown)]">No tasks completed today.</p>
        ) : (
          completedToday.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-3 rounded border-2 border-[var(--color-brown)] bg-[var(--color-cream)]"
            >
              <CatSprite variant="walking" size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-body italic text-[var(--color-dark-brown)] truncate">
                  {task.title}
                </div>
                <div className="text-xs text-[var(--color-brown)]">
                  Estimated: {task.estimatedMinutes} min · Actual: {task.actualMinutes} min
                </div>
              </div>
            </div>
          ))
        )}
        <div className="flex items-center gap-4 p-3 rounded border-2 border-[var(--color-saloon-wood)] bg-[var(--color-beige)]">
          <img
            src="/sprites/bed.svg"
            alt="Bed"
            width={96}
            height={48}
            style={{ imageRendering: 'pixelated' }}
          />
          <CatSprite variant="sleeping" size={48} />
          <span className="font-pixel text-[10px] text-[var(--color-dark-brown)]">
            Zzz...
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <PixelButton
          label={saved ? 'Saved!' : 'Save Report'}
          variant="primary"
          onClick={handleSaveReport}
          disabled={saved}
        />
        <PixelButton
          label="Back to home"
          variant="ghost"
          onClick={() => {
            setEndedDate(new Date().toISOString().slice(0, 10));
            navigate('/');
          }}
        />
      </div>
    </div>
  );
}
