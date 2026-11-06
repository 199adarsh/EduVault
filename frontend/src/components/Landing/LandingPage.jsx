import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_BASE } from '../../config/appPaths';
import './LandingPage.css';

/**
 * Hero-only landing. White-dominant CampusAxis surface language.
 *
 * Design reasons (antislop R-31):
 * - White / soft cool canvas: matches DESIGN.md + product UI screenshots
 * - Brand wordmark as display type: brand must survive without nav
 * - Desktop GIF as the only visual: real product, not illustration
 * - Single CTA to /app: real destination (portal login / home)
 * - Motion: short entrance only; GIF paused under reduced-motion
 */
export default function LandingPage() {
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    document.title = 'CampusAxis | Student academic portal';
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener?.('change', sync);
    };
  }, []);

  return (
    <div className={`lp ${entered ? 'lp--in' : ''}`}>
      <div className="lp-atmosphere" aria-hidden="true" />

      <header className="lp-nav">
        <Link to="/" className="lp-nav-brand" aria-label="CampusAxis home">
          <img src="/favicon.png" alt="" width={28} height={28} className="lp-nav-mark" />
          <span>CampusAxis</span>
        </Link>
        <Link to={APP_BASE} className="lp-nav-cta">
          Open portal
        </Link>
      </header>

      <main className="lp-main">
        <section className="lp-hero" aria-labelledby="lp-brand">
          <div className="lp-copy">
            <p className="lp-kicker">Student academic portal</p>
            <h1 id="lp-brand" className="lp-brand">
              CampusAxis
            </h1>
            <p className="lp-lede">
              Notes, attendance, notices, and roadmaps on one desktop desk for your semester.
            </p>
            <div className="lp-actions">
              <Link to={APP_BASE} className="lp-btn lp-btn--primary">
                Open student portal
              </Link>
            </div>
          </div>

          <div className="lp-stage">
            <div className="lp-screen">
              {reduceMotion ? (
                <img
                  src="/hero/01-home.png"
                  alt="CampusAxis desktop home dashboard with attendance heatmap and announcements"
                  width={1600}
                  height={1000}
                  fetchPriority="high"
                  className="lp-gif"
                />
              ) : (
                <img
                  src="/hero/campusaxis-desktop.gif?v=2"
                  alt="CampusAxis desktop product walkthrough across home, attendance, and announcements"
                  width={1600}
                  height={1000}
                  fetchPriority="high"
                  decoding="async"
                  className="lp-gif"
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
