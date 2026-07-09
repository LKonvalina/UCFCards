const rules = [
  'Goal is to get closer to 21 than the dealer.',
  'Face cards count as 10.',
  'Aces count as 1 or 11.',
  'Hit means draw a card.',
  'Stand means keep your hand.',
  'Bust means over 21.',
];

export function LearnPage() {
  return (
    <section className="page content-page">
      <div className="section-heading">
        <p className="section-eyebrow">Learn Blackjack Rules</p>
        <h1>Short rules for confident play.</h1>
      </div>

      <div className="learn-grid">
        {rules.map((rule) => (
          <article className="rule-card" key={rule}>
            <span aria-hidden="true">21</span>
            <p>{rule}</p>
          </article>
        ))}
      </div>

      <section className="content-band content-band--compact">
        <div className="section-heading">
          <p className="section-eyebrow">Strategy Snapshot</p>
          <h2>Use the table state, not guesswork.</h2>
        </div>
        <p className="wide-copy">
          Lower totals usually leave room to draw, totals of 17 or higher often favor standing, and dealer upcards from
          2 through 6 are weaker positions for the dealer.
        </p>
      </section>
    </section>
  );
}
