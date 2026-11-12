import { Link } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="dashboard-side-column" aria-label="More ways to play">
      <section className="dashboard-promo">
        <span className="dashboard-promo__icon" aria-hidden="true">🌟</span>
        <p className="dashboard-eyebrow">A LITTLE CHALLENGE</p>
        <h2>Every puzzle is a chance to shine.</h2>
        <p>Choose your difficulty and see how many bananas you can earn.</p>
        <Link to="/game-selection">
          Pick your challenge <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="dashboard-panel dashboard-quick-links">
        <p className="dashboard-eyebrow">YOUR SPACE</p>
        <h2>Quick links</h2>
        <Link to="/leaderboard">
          <span aria-hidden="true">🏅</span> Leaderboard <span aria-hidden="true">→</span>
        </Link>
        <Link to="/profile">
          <span aria-hidden="true">👤</span> Your profile <span aria-hidden="true">→</span>
        </Link>
        <Link to="/settings">
          <span aria-hidden="true">⚙️</span> Settings <span aria-hidden="true">→</span>
        </Link>
      </section>
    </aside>
  );
}

export default Sidebar;
