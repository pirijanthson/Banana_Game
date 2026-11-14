import { useEffect, useRef, useState } from "react";
import "./StatCard.css";


function useAnimatedNumber(target) {
  const numeric = typeof target === "number" ? target : null;
  const [display, setDisplay] = useState(numeric ?? target);
  const prevRef = useRef(numeric ?? 0);

  useEffect(() => {
    if (numeric === null) {
      setDisplay(target);
      return undefined;
    }

    const start = prevRef.current;
    const end = numeric;
    const diff = end - start;

    if (diff === 0) {
      setDisplay(end);
      return undefined;
    }

    const duration = 650;
    const startTime = performance.now();
    let frame;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric, target]);

  return display;
}

function StatCard({
  icon,
  label = "",
  value = "",
  variant = "default",
  trend, 
  subtitle, 
  loading = false, 
}) {
  const animatedValue = useAnimatedNumber(value);

  const trendIcon =
    trend === "up" ? "▲" : trend === "down" ? "▼" : null;

  const trendClass =
    trend === "up"
      ? "dashboard-stat-card__trend--up"
      : trend === "down"
        ? "dashboard-stat-card__trend--down"
        : "";

  return (
    <article
      className={`dashboard-stat-card dashboard-stat-card--${variant}${
        loading ? " is-loading" : ""
      }`}
      aria-label={`${label}: ${value}`}
      aria-busy={loading}
    >
      
      {icon && (
        <span
          className="dashboard-stat-card__icon"
          aria-hidden="true"
        >
          <span className="dashboard-stat-card__icon-glyph">
            {icon}
          </span>
        </span>
      )}

      {}
      <div className="dashboard-stat-card__content">
        {label && (
          <p className="dashboard-stat-card__label">{label}</p>
        )}

        {loading ? (
          <div
            className="dashboard-stat-card__skeleton"
            aria-hidden="true"
          />
        ) : (
          <p
            className="dashboard-stat-card__value"
            aria-live="polite"
          >
            {animatedValue}
            {trendIcon && (
              <span
                className={`dashboard-stat-card__trend ${trendClass}`}
                aria-hidden="true"
              >
                {trendIcon}
              </span>
            )}
          </p>
        )}

        {subtitle && !loading && (
          <p className="dashboard-stat-card__subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </article>
  );
}

export default StatCard;