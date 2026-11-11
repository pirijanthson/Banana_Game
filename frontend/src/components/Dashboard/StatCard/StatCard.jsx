import "./StatCard.css";

function StatCard({ icon, label, value, variant }) {
  return (
    <article
      className={`dashboard-stat-card dashboard-stat-card--${variant}`}
      aria-label={`${label}: ${value}`}
    >
      <span className="dashboard-stat-card__icon" aria-hidden="true">{icon}</span>
      <div>
        <p className="dashboard-stat-card__label">{label}</p>
        <p className="dashboard-stat-card__value" aria-live="polite">{value}</p>
      </div>
    </article>
  );
}

export default StatCard;
