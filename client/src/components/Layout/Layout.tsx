import type { ReactNode } from 'react';
import { useApp } from '../../state/AppContext';
import type { AppView } from '../../types';
import { Button } from '../Button/Button';

const navItems: { label: string; view: AppView }[] = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Create', view: 'create' },
  { label: 'Join', view: 'open-tables' },
  { label: 'Leaderboard', view: 'leaderboard' },
  { label: 'Learn', view: 'learn' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, view, navigate, startApp, loadingLabel, signOut } = useApp();

  const goTo = (target: AppView) => {
    if (!user && (target === 'dashboard' || target === 'create' || target === 'open-tables' || target === 'leaderboard')) {
      navigate('login');
      return;
    }

    if (user && !user.emailVerified && (target === 'dashboard' || target === 'create' || target === 'open-tables' || target === 'leaderboard')) {
      navigate('verify');
      return;
    }

    navigate(target);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate('landing')} aria-label="Go to landing page">
          <span className="brand__mark">21</span>
          <span className="brand__text">Blackjack Academy</span>
        </button>

        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              className={view === item.view ? 'nav__item nav__item--active' : 'nav__item'}
              key={item.view}
              type="button"
              onClick={() => goTo(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar__account">
          {user ? (
            <>
              <span className="avatar" aria-label={`${user.name} profile initials`}>{user.initials}</span>
              <span className="account-copy">
                <strong>{user.name}</strong>
                <small>{user.emailVerified ? 'Verified' : 'Needs verification'}</small>
              </span>
              <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Sign out">
                Sign Out
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={startApp} aria-label="Sign in">
              Sign In
            </Button>
          )}
        </div>
      </header>

      {loadingLabel ? (
        <div className="loading-strip" role="status" aria-live="polite">
          {loadingLabel}...
        </div>
      ) : null}

      <main>{children}</main>
    </div>
  );
}
