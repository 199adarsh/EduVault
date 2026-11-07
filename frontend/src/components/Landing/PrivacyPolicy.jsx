import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_BASE } from '../../config/appPaths';
import './LegalPage.css';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy | CampusAxis';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to="/" className="legal-header-back" aria-label="Back to home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <img src="/favicon.png" alt="" width={24} height={24} className="legal-header-brand-mark" />
            <span>CampusAxis</span>
          </Link>

          <div className="legal-header-actions">
            <nav className="legal-nav-switch" aria-label="Legal document switcher">
              <Link to="/privacy" className="legal-nav-tab legal-nav-tab--active" aria-current="page">
                Privacy Policy
              </Link>
              <Link to="/terms" className="legal-nav-tab">
                Terms of Use
              </Link>
            </nav>

            <Link to={APP_BASE} className="legal-portal-cta">
              Open portal
            </Link>
          </div>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-intro">
          <span className="legal-kicker">Legal &amp; Data Transparency</span>
          <h1 className="legal-title">Privacy Policy</h1>
          <div className="legal-meta">
            <span className="legal-meta-item">
              <strong>Effective Date:</strong> November 6, 2026
            </span>
            <span>&bull;</span>
            <span className="legal-meta-item">
              <strong>Version:</strong> 2.4 (Academic Release)
            </span>
          </div>
        </div>

        {/* Essential Institutional Disclaimer */}
        <div className="legal-callout" role="note">
          <div className="legal-callout-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="legal-callout-content">
            <h2 className="legal-callout-title">Non-Affiliation Notice</h2>
            <p className="legal-callout-p">
              CampusAxis is an independent student academic companion. We are not officially affiliated with, endorsed by, or integrated into any university administrative council, college ERP, or state education board.
            </p>
          </div>
        </div>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">01.</span> Our Core Privacy Commitment
          </h2>
          <p className="legal-p">
            CampusAxis is built on a simple premise: <strong>your academic journey belongs exclusively to you</strong>. Unlike commercial social networks or advertisement-driven services, CampusAxis does not monetize student attention or sell behavioral telemetry to third-party data brokers, recruitment agencies, or advertising platforms.
          </p>
          <div className="legal-pill-group">
            <span className="legal-feature-badge">🚫 Zero third-party advertisements</span>
            <span className="legal-feature-badge">🔒 Encrypted data transmission (TLS/HTTPS)</span>
            <span className="legal-feature-badge">🛡️ No sale of student records</span>
          </div>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">02.</span> Information We Collect
          </h2>
          <p className="legal-p">
            We only collect information necessary to deliver personalized academic dashboard calculations and retain your notes across devices:
          </p>
          <ul className="legal-list">
            <li>
              <strong>Account Credentials:</strong> Basic identity details such as your name, college email address, and authentication provider identifiers (e.g., Google OAuth tokens).
            </li>
            <li>
              <strong>Self-Reported Academic Data:</strong> Subject catalog, semester credit requirements, personal attendance logs, lecture absences, syllabus completion checklists, and roadmaps.
            </li>
            <li>
              <strong>Student Notes &amp; Vault Content:</strong> Rich text notes, lecture summaries, markdown files, and subject categorization tags that you actively write or upload to your workspace.
            </li>
            <li>
              <strong>Technical Diagnostics:</strong> Anonymized telemetry including browser type, operating system version, and error crash logs to ensure portal stability and troubleshoot performance issues.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">03.</span> Information We Never Collect
          </h2>
          <p className="legal-p">
            To guarantee complete peace of mind during your study sessions, our system is engineered specifically to exclude sensitive personal telemetry:
          </p>
          <ul className="legal-list">
            <li>We do not collect banking, credit card, or payment data (CampusAxis is completely free for students).</li>
            <li>We do not track physical GPS coordinates or background device location.</li>
            <li>We do not record keystrokes outside the explicit note-taking canvas.</li>
            <li>We never access device microphones, cameras, or local photo libraries without explicit, permission-gated user upload actions.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">04.</span> How We Use Your Academic Data
          </h2>
          <p className="legal-p">
            Your self-logged data is processed strictly for student-facing features inside your own account:
          </p>
          <ul className="legal-list">
            <li>
              <strong>Live Heatmap &amp; Analytics:</strong> Transforming your attendance ticks into weekly heatmaps and computing real-time &ldquo;bunk budgets&rdquo; based on your target percentage criteria (e.g. 75%).
            </li>
            <li>
              <strong>Smart Vault Search:</strong> Indexing your semester notes and subject folders for instant client-side retrieval during revision.
            </li>
            <li>
              <strong>Notice Feed Aggregation:</strong> Delivering curated circulars, university announcements, and timetable reminders relevant to your branch.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">05.</span> Storage, Security &amp; Retention
          </h2>
          <p className="legal-p">
            All user sessions and API exchanges communicate over encrypted TLS 1.3 endpoints. Academic notes and database states are secured using modern row-level access policies, ensuring that only authenticated users can query or mutate their respective academic tables.
          </p>
          <p className="legal-p">
            <strong>Data Retention:</strong> We store your semester records for as long as your account remains in active standing. If you transition to a new semester or graduate, you retain the ability to archive or permanently purge past academic logs.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">06.</span> Your Rights &amp; Control
          </h2>
          <p className="legal-p">
            You maintain full sovereignty over your data under applicable data privacy frameworks:
          </p>
          <ul className="legal-list">
            <li><strong>Right to Export:</strong> You can export your notes, roadmaps, and attendance summaries at any time.</li>
            <li><strong>Right to Rectification:</strong> You may adjust, correct, or recalculate previous attendance entries directly from the dashboard.</li>
            <li><strong>Right to Erasure:</strong> You can request permanent account deletion, which flushes all notes, analytics, and identifiers from our primary datastores within 30 days.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">07.</span> Contact &amp; Privacy Inquiries
          </h2>
          <p className="legal-p">
            If you have questions regarding data privacy, security disclosures, or account deletion requests, our student developer team is reachable via:
          </p>
          <p className="legal-p">
            <strong>Email:</strong> <a href="mailto:privacy@campusaxis.app" style={{ color: 'var(--lp-blue)', textDecoration: 'none', fontWeight: 600 }}>privacy@campusaxis.app</a><br />
            <strong>Project Repository:</strong> CampusAxis Student Open Source Initiative
          </p>
        </section>

        <footer className="legal-footer">
          <span>&copy; {new Date().getFullYear()} CampusAxis. Engineered for students.</span>
          <div className="legal-footer-links">
            <Link to="/">Home</Link>
            <Link to="/terms">Terms of Use</Link>
            <Link to={APP_BASE}>Open portal</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

