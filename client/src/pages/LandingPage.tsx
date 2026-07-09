import { useApp } from '../state/AppContext';
import { Button } from '../components/Button/Button';

const features = [
  'Multiplayer tournament lobby',
  'Dealer-based blackjack rounds',
  'Strategy tips while you play',
  'Deck of Cards API integration',
  'Google sign-in',
  'Email-verified onboarding',
];

const heroCards = [
  'https://deckofcardsapi.com/static/img/AH.png',
  'https://deckofcardsapi.com/static/img/KS.png',
  'https://deckofcardsapi.com/static/img/9D.png',
];

export function LandingPage() {
  const { startApp } = useApp();

  return (
    <div className="page page--landing">
      <section className="hero">
        <div className="hero__scene" aria-hidden="true">
          {heroCards.map((src, index) => (
            <img className={`hero__card hero__card--${index + 1}`} src={src} alt="" key={src} />
          ))}
          <div className="hero__table">
            <span>Play-Money</span>
            <strong>21</strong>
            <span>Learning Table</span>
          </div>
        </div>

        <div className="hero__content">
          <p className="section-eyebrow">Play-Money Training Platform</p>
          <h1>Blackjack Academy Tournament</h1>
          <p>A play-money multiplayer blackjack learning platform.</p>
          <div className="hero__actions">
            <Button size="lg" onClick={startApp} aria-label="Start Blackjack Academy Tournament">
              Get Started
            </Button>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="section-heading">
          <p className="section-eyebrow">Training Features</p>
          <h2>Everything needed to practice blackjack in a structured tournament format.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature}>
              <span aria-hidden="true">✓</span>
              <h3>{feature}</h3>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
