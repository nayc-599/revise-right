import type { Task } from '../../types';

type Variant = 'list' | 'wanted-poster' | 'wheel-segment';

interface TaskCardProps {
  task: Task;
  variant?: Variant;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onClick?: () => void;
  completed?: boolean;
}

export function TaskCard({
  task,
  variant = 'list',
  draggable = false,
  onDragStart,
  onClick,
  completed = false,
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
        className={`border-4 border-[var(--color-brown)] rounded p-3 font-body text-center min-w-[140px] ${
          completed
            ? 'bg-[var(--color-brown)]/20 opacity-60 pointer-events-none'
            : 'bg-[var(--color-beige)] shadow-[4px_4px_0_var(--color-pixel-shadow)] cursor-pointer hover:brightness-105'
        }`}
        style={completed ? undefined : { boxShadow: '4px 4px 0 var(--color-pixel-shadow)' }}
      >
        <div className="font-pixel text-[8px] text-[var(--color-dark-brown)] mb-2 tracking-wider">
          WANTED
        </div>
        <div className="text-[var(--color-dark-brown)] italic text-sm truncate">
          {task.title}
        </div>
        <div className="text-[var(--color-brown)] text-xs mt-1">
          {task.estimatedMinutes} min
        </div>
        {completed && (
          <div className="mt-2 font-pixel text-[8px] text-[var(--color-casino-red)]">
            GOT &apos;EM
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
