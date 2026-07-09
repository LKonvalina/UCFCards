import { SignIn } from '@clerk/clerk-react';
import { Button } from '../components/Button/Button';
import { useApp } from '../state/AppContext';

export function LoginPage() {
  const { navigate } = useApp();

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--clerk">
        <p className="section-eyebrow">Secure Sign In</p>
        <h1>Welcome back to the tournament.</h1>
        <p>Sign in with Google to access tournaments, leaderboards, and learning tools.</p>

        <div className="clerk-sign-in">
          <SignIn routing="hash" />
        </div>

        <div className="auth-card__actions">
          <Button variant="ghost" size="sm" onClick={() => navigate('landing')} aria-label="Return to landing page">
            Back to home
          </Button>
        </div>

        <small>Your account keeps tournament progress tied to your profile.</small>
      </div>
    </section>
  );
}
