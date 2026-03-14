import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--color-gold)] border-4 border-[var(--color-dark-brown)] text-[var(--color-dark-brown)] shadow-[4px_4px_0_var(--color-pixel-shadow)] hover:brightness-110 hover:-translate-y-0.5 focus:animate-pulse',
  secondary:
    'bg-[var(--color-beige)] border-4 border-[var(--color-brown)] text-[var(--color-dark-brown)] shadow-[3px_3px_0_var(--color-pixel-shadow)] hover:brightness-105',
  danger:
    'bg-[var(--color-casino-red)] border-4 border-[var(--color-dark-brown)] text-white shadow-[4px_4px_0_var(--color-pixel-shadow)]',
  ghost:
    'bg-transparent border-2 border-[var(--color-brown)] text-[var(--color-brown)] hover:bg-[var(--color-beige)]',
};

export function PixelButton({
  label,
  variant = 'primary',
  onClick,
  icon,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: PixelButtonProps) {
  return (
    <button
      type={type}
      className={`font-pixel text-xs uppercase px-4 py-2 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-gold)] disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}
