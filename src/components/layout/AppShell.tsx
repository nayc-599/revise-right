import { Link, useLocation } from 'react-router-dom';

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isTasks = location.pathname === '/tasks';
  const isReflection = location.pathname === '/reflection';
  const isGoodnight = location.pathname === '/goodnight';

  return (
    <div className="min-h-screen bg-[var(--color-cream)] font-body flex flex-col">
      {!isHome && (
        <header className="border-b-4 border-[var(--color-brown)] bg-[var(--color-beige)] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <span className="font-pixel text-sm sm:text-base text-[var(--color-dark-brown)]">
            {isTasks ? (
              'Step Flow'
            ) : (
              <Link
                to="/"
                className="hover:opacity-90 focus-visible:outline focus-visible:outline-2 rounded"
              >
                Step Flow
              </Link>
            )}
          </span>
          {!isTasks && (
            <nav className="flex items-center gap-3 flex-wrap">
              <Link
                to="/tasks"
                className="font-body text-sm font-semibold text-[var(--color-brown)] hover:text-[var(--color-dark-brown)]"
              >
                Add / Manage Tasks
              </Link>
              <Link
                to="/reflection"
                className={`font-body text-sm font-semibold ${
                  isReflection
                    ? 'text-[var(--color-dark-brown)]'
                    : 'text-[var(--color-brown)] hover:text-[var(--color-dark-brown)]'
                }`}
              >
                Reflection
              </Link>
              <Link
                to="/goodnight"
                className={`font-body text-sm font-semibold ${
                  isGoodnight
                    ? 'text-[var(--color-dark-brown)]'
                    : 'text-[var(--color-brown)] hover:text-[var(--color-dark-brown)]'
                }`}
              >
                Goodnight
              </Link>
            </nav>
          )}
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
