type Variant = 'sitting' | 'sleeping' | 'walking' | 'cowboy';

interface CatSpriteProps {
  variant?: Variant;
  size?: number;
  animated?: boolean;
  className?: string;
}

const spriteMap: Record<Variant, string> = {
  sitting: '/sprites/cat-sitting.svg',
  cowboy: '/sprites/cat-cowboy.svg',
  sleeping: '/sprites/cat-sleeping.svg',
  walking: '/sprites/cat-walking.svg',
};

export function CatSprite({
  variant = 'sitting',
  size = 64,
  animated = false,
  className = '',
}: CatSpriteProps) {
  const src = spriteMap[variant];
  return (
    <img
      src={src}
      alt={`Pixel art cat - ${variant}`}
      width={size}
      height={size}
      className={`${animated ? 'animate-pulse' : ''} ${className}`.trim()}
      style={{ imageRendering: 'pixelated' }}
      data-sprite={variant}
    />
  );
}
