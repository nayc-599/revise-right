import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { CatSprite } from '../components/shared/CatSprite';
import { PixelButton } from '../components/shared/PixelButton';

export function GameWheelPage() {
  const navigate = useNavigate();
  const taskQueue = useGameStore((s) => s.taskQueue);

  return (
    <div className="font-body p-6 max-w-4xl mx-auto">
      <h2 className="font-pixel text-sm text-[var(--color-dark-brown)] mb-4">
        You spin me right round
      </h2>
      <CatSprite variant="sitting" size={96} />
      <p className="text-[var(--color-brown)] mt-4">
        Tasks for this session: {taskQueue.length}
      </p>
      <div className="mt-4">
        <PixelButton
          label="Back to week plan"
          variant="ghost"
          onClick={() => navigate('/')}
        />
      </div>
    </div>
  );
}
