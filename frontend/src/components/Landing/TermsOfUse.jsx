import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_BASE } from '../../config/appPaths';
import './LegalPage.css';

export default function TermsOfUse() {
  useEffect(() => {
    document.title = 'Terms of Use | CampusAxis';
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
              <Link to="/privacy" className="legal-nav-tab">
                Privacy Policy
              </Link>
              <Link to="/terms" className="legal-nav-tab legal-nav-tab--active" aria-current="page">
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
          <span className="legal-kicker">Terms &amp; User Agreement</span>
          <h1 className="legal-title">Terms of Use</h1>
          <div className="legal-meta">
            <span className="legal-meta-item">
              <strong>Last Updated:</strong> November 6, 2026
            </span>
            <span>&bull;</span>
            <span className="legal-meta-item">
              <strong>Agreement Version:</strong> 2.4
            </span>
          </div>
        </div>

        {/* Critical Academic & Institutional Disclaimer */}
        <div className="legal-callout" role="note">
          <div className="legal-callout-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="legal-callout-content">
            <h2 className="legal-callout-title">Authoritative Academic Record Disclaimer</h2>
            <p className="legal-callout-p">
              CampusAxis is an independent student planning assistant. Attendance logs, bunk calculators, and syllabus milestones are calculated purely based on data entered by the user. <strong>Official college attendance registers, university ERP systems, and departmental notice boards remain the sole authoritative legal records</strong> for attendance requirements, hall ticket issuance, exam eligibility, and grading.
            </p>
          </div>
        </div>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">01.</span> Acceptance of Agreement
          </h2>
          <p className="legal-p">
            By creating an account, browsing the website, or accessing the portal at <strong>{APP_BASE}</strong>, you agree to be bound by these Terms of Use and our companion Privacy Policy. If you do not agree to these terms in their entirety, please refrain from using CampusAxis.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">02.</span> Eligibility &amp; Account Security
          </h2>
          <ul className="legal-list">
            <li>
              <strong>Age of Access:</strong> You must be at least 13 years of age, or the legal age of digital majority in your jurisdiction, to utilize this portal.
            </li>
            <li>
              <strong>Credential Protection:</strong> You are responsible for safeguarding your authentication credentials. Any activity logged under your authenticated identity is your sole responsibility.
            </li>
            <li>
              <strong>Accurate Logging:</strong> Because analytics, heatmap colorations, and bunk allowances derive from your inputs, entering inaccurate subject timetables or false attendance ticks will produce misleading estimates.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">03.</span> Permitted Use &amp; Community Conduct
          </h2>
          <p className="legal-p">
            CampusAxis is provided exclusively for personal study tracking, revision organization, and academic planning. You explicitly agree not to:
          </p>
          <ul className="legal-list">
            <li>Engage in automated scraping, data mining, or programmatic harvesting of CampusAxis web pages or services.</li>
            <li>Attempt to probe, scan, or breach the security boundaries or authentication protocols of the platform.</li>
            <li>Upload malicious code, corrupted files, defamatory materials, or intellectual property belonging to third parties without authorization.</li>
            <li>Subvert or tamper with client-side or server-side rate limits, caching layers, or API endpoints.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">04.</span> Intellectual Property &amp; Content Ownership
          </h2>
          <p className="legal-p">
            <strong>Your Content:</strong> You retain complete and unencumbered ownership of all notes, lecture summaries, markdown documents, and study materials you create or host in your CampusAxis account. We claim zero proprietary stake in your academic work.
          </p>
          <p className="legal-p">
            <strong>Platform Rights:</strong> All software code, visual styling, liquid-glass user interface motifs, brand marks, and iconography associated with CampusAxis are the intellectual property of the CampusAxis project contributors, protected under applicable copyright and digital asset laws.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">05.</span> Limitation of Liability
          </h2>
          <p className="legal-p">
            CampusAxis is delivered on an <strong>&ldquo;as is&rdquo;</strong> and <strong>&ldquo;as available&rdquo;</strong> basis without warranties of uninterrupted uptime or error-free execution.
          </p>
          <p className="legal-p">
            To the maximum extent permitted under applicable law, CampusAxis, its maintainers, and contributors shall not be held liable for:
          </p>
          <ul className="legal-list">
            <li>Academic penalties, debarment from examination halls, or loss of internal marks arising from discrepancies between self-logged attendance and institutional registers.</li>
            <li>Unintended service interruptions, hosting provider outages, or network latencies during critical study or revision hours.</li>
            <li>Unintentional loss or corruption of study notes due to device hardware failures or local browser cache clearance.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">06.</span> Account Suspension &amp; Termination
          </h2>
          <p className="legal-p">
            We reserve the right to suspend or terminate access to any account that engages in abusive automated queries, security tampering, or platform disruption. Users may delete their accounts and wipe all stored semester logs at any time from within the application settings.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">07.</span> Governing Law
          </h2>
          <p className="legal-p">
            These terms and any disputes arising out of your utilization of CampusAxis shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-h2">
            <span className="legal-h2-number">08.</span> Inquiries &amp; Legal Notices
          </h2>
          <p className="legal-p">
            For questions regarding these Terms of Use, please reach out via:
          </p>
          <p className="legal-p">
            <strong>Email:</strong> <a href="mailto:legal@campusaxis.app" style={{ color: 'var(--lp-blue)', textDecoration: 'none', fontWeight: 600 }}>legal@campusaxis.app</a>
          </p>
        </section>

        <footer className="legal-footer">
          <span>&copy; {new Date().getFullYear()} CampusAxis. Engineered for students.</span>
          <div className="legal-footer-links">
            <Link to="/">Home</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to={APP_BASE}>Open portal</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

