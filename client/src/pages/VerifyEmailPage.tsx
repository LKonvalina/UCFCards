import { Button } from '../components/Button/Button';
import { useApp } from '../state/AppContext';

export function VerifyEmailPage() {
  const { user, verifyEmail, navigate, loadingLabel } = useApp();

  if (!user) {
    return (
      <section className="empty-state">
        <h1>Sign in to continue.</h1>
        <Button onClick={() => navigate('login')}>Go to Login</Button>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="section-eyebrow">Email Verification</p>
        <h1>Verify your email to join tournaments.</h1>
        <p className="auth-card__email">{user.email}</p>
        <p>Open the verification link sent to your inbox, then refresh your status here.</p>

        {user.emailVerified ? (
          <>
            <div className="success-banner" role="status">Email verified.</div>
            <Button fullWidth size="lg" onClick={() => navigate('dashboard')} aria-label="Continue to dashboard">
              Continue to Dashboard
            </Button>
          </>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={verifyEmail}
            disabled={Boolean(loadingLabel)}
            aria-label="Refresh email verification status"
          >
            Refresh Verification Status
          </Button>
        )}
      </div>
    </section>
  );
}
