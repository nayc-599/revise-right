import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useTaskStore } from '../store/useTaskStore';
import type { GameMode } from '../types';
import { PixelButton } from '../components/shared/PixelButton';
import { CatSprite } from '../components/shared/CatSprite';

export function GameChoicePage() {
  const navigate = useNavigate();
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setTaskQueue = useGameStore((s) => s.setTaskQueue);
  const getTodaysTasks = useTaskStore((s) => s.getTodaysTasks);

  const goToGame = (mode: GameMode) => {
    const todaysTasks = getTodaysTasks();
    const taskIds = todaysTasks.map((t) => t.id);
    setGameMode(mode);
    setTaskQueue(taskIds);
    navigate(mode === 'shooting' ? '/game/shooting' : '/game/wheel');
  };

  return (
    <div className="font-body p-6 max-w-2xl mx-auto text-center">
      <h2 className="font-pixel text-sm text-[var(--color-dark-brown)] mb-6">
        Select today&apos;s game
      </h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => goToGame('shooting')}
          className="flex flex-col items-center gap-4 p-6 rounded-lg border-4 border-[var(--color-saloon-wood)] bg-[var(--color-saloon-tan)] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-gold)]"
          aria-label="Play shooting game: Hit me with your best shot"
        >
          <CatSprite variant="cowboy" size={80} />
          <span className="font-pixel text-xs text-[var(--color-dark-brown)]">
            Hit me with your best shot
          </span>
          <p className="font-body text-sm text-[var(--color-brown)]">
            Shoot your tasks down one by one in whatever order you like.
          </p>
        </button>

        <button
          type="button"
          onClick={() => goToGame('wheel')}
          className="flex flex-col items-center gap-4 p-6 rounded-lg border-4 border-[var(--color-casino-dark)] bg-[var(--color-beige)] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-gold)]"
          aria-label="Play wheel game: You spin me right round"
        >
          <CatSprite variant="sitting" size={80} />
          <span className="font-pixel text-xs text-[var(--color-dark-brown)]">
            You spin me right round
          </span>
          <p className="font-body text-sm text-[var(--color-brown)]">
            Feeling lucky? Let fate decide the order of your tasks today.
          </p>
        </button>
      </div>

      <div className="mt-8">
        <PixelButton
          label="Back to week plan"
          variant="ghost"
          onClick={() => navigate('/')}
        />
      </div>
    </div>
  );
}
