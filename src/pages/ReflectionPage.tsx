import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatSprite } from '../components/shared/CatSprite';
import { PixelButton } from '../components/shared/PixelButton';
import { useTaskStore } from '../store/useTaskStore';
import type { ReflectionOption } from '../types';

const REFLECTION_OPTIONS: { value: ReflectionOption; label: string }[] = [
  { value: 'overran', label: 'Other tasks took longer than expected today.' },
  { value: 'distracted', label: 'I got distracted :<' },
  { value: 'procrastinating', label: 'Procrastinating from this specific task.' },
  { value: 'custom', label: "Something else (I'll write it)." },
];

export function ReflectionPage() {
  const navigate = useNavigate();
  const tasks = useTaskStore((s) => s.tasks);
  const today = new Date().toISOString().slice(0, 10);
  const todaysTasks = tasks.filter((t) => t.dueDate === today && t.status !== 'cancelled');
  const completedCount = todaysTasks.filter((t) => t.status === 'complete').length;
  const incompleteCount = todaysTasks.length - completedCount;

  const [selectedOption, setSelectedOption] = useState<ReflectionOption | null>(null);
  const [freeText, setFreeText] = useState('');
  const [reEstimate, setReEstimate] = useState(false);

  const allDone = incompleteCount === 0 && todaysTasks.length > 0;

  return (
    <div className="font-body p-6 max-w-2xl mx-auto">
      <h2 className="font-pixel text-sm text-[var(--color-dark-brown)] mb-2">
        Reflection
      </h2>
      <CatSprite variant="sitting" size={64} className="mb-4" />

      {allDone ? (
        <div className="space-y-4">
          <p className="text-[var(--color-brown)]">
            You completed all {completedCount} task{todaysTasks.length !== 1 ? 's' : ''} today. Nice!
          </p>
          <p className="text-[var(--color-brown)] text-sm">
            Open journaling — write anything you like about how today went.
          </p>
          <textarea
            className="w-full h-32 px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body"
            placeholder="Today I..."
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
          />
        </div>
      ) : incompleteCount > 0 ? (
        <div className="space-y-4">
          <p className="text-[var(--color-brown)]">
            Reflect on your productivity today. What was the main reason you didn&apos;t complete {incompleteCount} task{incompleteCount !== 1 ? 's' : ''}?
          </p>
          <ul className="space-y-2">
            {REFLECTION_OPTIONS.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => setSelectedOption(opt.value)}
                  className={`w-full text-left px-4 py-2 rounded border-2 font-body text-sm ${
                    selectedOption === opt.value
                      ? 'border-[var(--color-gold)] bg-[var(--color-beige)]'
                      : 'border-[var(--color-brown)] bg-[var(--color-cream)]'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
          {selectedOption === 'custom' && (
            <textarea
              className="w-full h-24 px-3 py-2 border-2 border-[var(--color-brown)] rounded font-body"
              placeholder="Your response..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
            />
          )}
          {selectedOption === 'overran' && (
            <label className="flex items-center gap-2 text-sm text-[var(--color-brown)]">
              <input
                type="checkbox"
                checked={reEstimate}
                onChange={(e) => setReEstimate(e.target.checked)}
              />
              Would you like to re-estimate the length of tomorrow&apos;s tasks?
            </label>
          )}
        </div>
      ) : (
        <p className="text-[var(--color-brown)]">No tasks scheduled for today. Plan your week from the home page!</p>
      )}

      <div className="mt-8">
        <PixelButton label="Back to home" variant="ghost" onClick={() => navigate('/')} />
      </div>
    </div>
  );
}
