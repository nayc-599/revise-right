import type { Task } from '../../types';
import wantedPosterBg from '../../../assets/elements/wanted_poster.png';
import bulletHoleImg from '../../../assets/elements/bullet_hole.png';

type Variant = 'list' | 'wanted-poster' | 'wheel-segment';

interface TaskCardProps {
  task: Task;
  variant?: Variant;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onClick?: () => void;
  completed?: boolean;
  selected?: boolean;
}

export function TaskCard({
  task,
  variant = 'list',
  draggable = false,
  onDragStart,
  onClick,
  completed = false,
  selected = false,
}: TaskCardProps) {
  const isLocked = task.requiresTaskIds.length > 0;

  if (variant === 'list') {
    return (
      <div
        draggable={draggable}
        onDragStart={(e) => {
          if (draggable && onDragStart) {
            onDragStart(e, task.id);
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
          }
        }}
        className="bg-[var(--color-cream)] border-2 border-[var(--color-brown)] rounded p-3 font-body text-[var(--color-dark-brown)] cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="italic flex-1 truncate">{task.title}</span>
          <span className="text-sm text-[var(--color-brown)] shrink-0">
            {task.estimatedMinutes} min
          </span>
          {isLocked && (
            <span className="shrink-0" aria-label="Locked">
              🔒
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'wanted-poster') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={completed ? undefined : onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !completed && onClick) onClick();
        }}
        className={`border-4 rounded p-4 font-body text-center w-[400px] relative overflow-hidden ${
          completed
            ? 'border-[var(--color-brown)] opacity-60 pointer-events-none'
            : selected
              ? 'border-[var(--color-dark-brown)] shadow-[4px_4px_0_var(--color-pixel-shadow)] cursor-pointer'
              : 'border-[var(--color-brown)] shadow-[4px_4px_0_var(--color-pixel-shadow)] cursor-pointer hover:brightness-105'
        }`}
        style={{
          backgroundImage: `url(${wantedPosterBg})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          ...(completed ? {} : { boxShadow: '4px 4px 0 var(--color-pixel-shadow)' }),
        }}
      >
        <div className="relative flex flex-col items-center justify-center min-h-[200px]">
          <div className="font-pixel text-[10px] mb-2 tracking-wider text-[#3B1A08]">
          </div>
          <div className="italic text-base truncate text-[#3B1A08] text-center max-w-full">
            {task.title}
          </div>
          <div className="text-sm mt-1 text-[#3B1A08]">
            {task.estimatedMinutes} min
          </div>
        </div>
        {completed && (
          <div
            className="absolute pointer-events-none w-[40%] aspect-square"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            aria-hidden
          >
            <img
              src={bulletHoleImg}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (draggable && onDragStart) {
          onDragStart(e, task.id);
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
        }
      }}
      className="bg-[var(--color-cream)] border-2 border-[var(--color-brown)] rounded p-3 font-body"
    >
      <span className="italic">{task.title}</span>
      <span className="text-sm text-[var(--color-brown)] ml-2">
        {task.estimatedMinutes} min
      </span>
      {isLocked && <span aria-hidden>🔒</span>}
    </div>
  );
}
