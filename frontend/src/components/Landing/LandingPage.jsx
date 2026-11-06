import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_BASE } from '../../config/appPaths';
import './LandingPage.css';

/* ─── Data ─────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Home',         href: '#hero'        },
  { label: 'Features',     href: '#features'    },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
];

const HERO_FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12h6M9 16h4M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 4a2 2 0 0 1 4 0v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: 'Smart notes',
    desc: 'Subject-linked notes with quick search across your semester.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <circle cx="8" cy="15" r="1.25" fill="currentColor"/>
        <circle cx="12" cy="15" r="1.25" fill="currentColor"/>
        <circle cx="16" cy="15" r="1.25" fill="currentColor"/>
      </svg>
    ),
    label: 'Attendance tracking',
    desc: 'Live per-subject counts, heatmap, and bunk budget at a glance.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: 'College notices',
    desc: 'Exam schedules, circulars, and announcements in one feed.',
  },
];

const FEATURES_GRID = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12h6M9 16h4M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 4a2 2 0 0 1 4 0v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Notes & vault',
    body: 'Write, organise, and retrieve notes per subject. Full-text search across every semester.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M8 14l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Attendance heatmap',
    body: 'See your attendance % per subject on a colour-coded calendar. Know your bunk budget instantly.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Live notices',
    body: 'Exam schedules, holiday lists, and college circulars pushed to one scrollable feed.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Academic roadmap',
    body: 'Map your subjects, deadlines, and milestones on a semester-long planner.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'One-screen dashboard',
    body: 'Everything visible at a glance — no tabs, no switching apps, no context loss.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Your data, private',
    body: 'Everything stays in your account. No ads, no tracking, no sharing with third parties.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Open the portal',
    body: 'Sign in with your college email in one click — no installs, no setup.',
  },
  {
    num: '02',
    title: 'Set up your subjects',
    body: 'Add subjects, credit counts, and professors. Takes about two minutes.',
  },
  {
    num: '03',
    title: 'Log attendance daily',
    body: 'Mark present or absent after each lecture. The heatmap updates live.',
  },
  {
    num: '04',
    title: 'Stay on top all semester',
    body: 'Check notices, write notes, track your roadmap — everything in one place.',
  },
];

const TESTIMONIALS = [
  {
    quote: "Finally stopped using five different apps. CampusAxis has my attendance, notes, and notices all in one spot.",
    name: 'Riya M.',
    role: 'SE Computer Engineering',
  },
  {
    quote: "The bunk budget feature literally saved my attendance twice this semester. I always know exactly how many classes I can miss.",
    name: 'Aditya K.',
    role: 'TE Electronics',
  },
  {
    quote: "Super clean UI. It doesn't feel like a college tool — it feels like a proper product.",
    name: 'Sneha P.',
    role: 'BE IT',
  },
];

/* ─── Component ─────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [entered, setEntered]           = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  /* Scroll-based navbar visibility */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Active section via IntersectionObserver */
  useEffect(() => {
    const sections = ['hero', 'features', 'how-it-works', 'testimonials'];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  /* Entrance + reduced-motion */
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

  /* Smooth scroll helper */
  const scrollTo = (e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`lp ${entered ? 'lp--in' : ''}`}>
      <div className="lp-atmosphere" aria-hidden="true" />
      <div className="lp-dotgrid"    aria-hidden="true" />

      {/* ── Liquid glass floating pill navbar ── */}
      <nav
        className={`lp-pill-nav ${scrolled ? 'lp-pill-nav--visible' : ''}`}
        aria-label="Site navigation"
      >
        <div className="lp-pill-nav-inner">
          {/* Brand */}
          <a
            href="#hero"
            className="lp-pill-brand"
            onClick={(e) => scrollTo(e, '#hero')}
            aria-label="CampusAxis — back to top"
          >
            <img src="/favicon.png" alt="" width={22} height={22} className="lp-pill-mark" />
            <span>CampusAxis</span>
          </a>

          {/* Links */}
          <ul className="lp-pill-links" role="list">
            {NAV_LINKS.map(({ label, href }) => {
              const sectionId = href.replace('#', '');
              const isActive  = activeSection === sectionId;
              return (
                <li key={href}>
                  <a
                    href={href}
                    onClick={(e) => scrollTo(e, href)}
                    className={`lp-pill-link ${isActive ? 'lp-pill-link--active' : ''}`}
                    aria-current={isActive ? 'location' : undefined}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* CTA */}
          <Link to={APP_BASE} className="lp-pill-cta">
            Open portal
          </Link>
        </div>
      </nav>

      {/* ── Static top-bar (before pill appears) ── */}
      <header className="lp-nav" aria-label="Brand header">
        <Link to="/" className="lp-nav-brand" aria-label="CampusAxis home">
          <img src="/favicon.png" alt="" width={28} height={28} className="lp-nav-mark" />
          <span>CampusAxis</span>
        </Link>
        <Link to={APP_BASE} className="lp-nav-cta">
          Open portal
        </Link>
      </header>

      <main className="lp-main">

        {/* ════ HERO ════════════════════════════════════════════════ */}
        <section id="hero" className="lp-hero" aria-labelledby="lp-brand">
          <div className="lp-copy">
            <p className="lp-kicker">Student academic portal</p>
            <h1 id="lp-brand" className="lp-brand">CampusAxis</h1>
            <p className="lp-lede">
              Notes, attendance, notices, and roadmaps on one desktop desk for your semester.
            </p>
            <div className="lp-actions">
              <Link to={APP_BASE} className="lp-btn lp-btn--primary">
                Open student portal
              </Link>
            </div>

            <ul className="lp-features" aria-label="Key features">
              {HERO_FEATURES.map(({ icon, label, desc }) => (
                <li key={label} className="lp-feature">
                  <span className="lp-feature-icon">{icon}</span>
                  <span className="lp-feature-text">
                    <strong className="lp-feature-label">{label}</strong>
                    <span className="lp-feature-desc">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-stage">
            <div className="lp-screen">
              {reduceMotion ? (
                <img
                  src="/hero/01-home.png"
                  alt="CampusAxis desktop home dashboard"
                  width={1280} height={800}
                  fetchPriority="high"
                  className="lp-media"
                />
              ) : (
                <video
                  className="lp-media"
                  autoPlay muted loop playsInline
                  aria-label="CampusAxis desktop product walkthrough"
                  width={1280} height={800}
                >
                  <source src="/hero/campusaxis-desktop.webm" type="video/webm" />
                  <source src="/hero/campusaxis-desktop.mp4"  type="video/mp4"  />
                </video>
              )}
            </div>
          </div>
        </section>

        {/* ════ FEATURES ════════════════════════════════════════════ */}
        <section id="features" className="lp-section" aria-labelledby="features-heading">
          <div className="lp-section-inner">
            <div className="lp-section-head">
              <p className="lp-section-kicker">Everything you need</p>
              <h2 id="features-heading" className="lp-section-title">
                Built for the whole semester
              </h2>
              <p className="lp-section-sub">
                Six tools, one surface. No switching between apps halfway through a lecture.
              </p>
            </div>
            <ul className="lp-feat-grid" aria-label="Features">
              {FEATURES_GRID.map(({ icon, title, body }) => (
                <li key={title} className="lp-feat-card">
                  <span className="lp-feat-icon">{icon}</span>
                  <strong className="lp-feat-title">{title}</strong>
                  <p className="lp-feat-body">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════════════════════════════════════════ */}
        <section id="how-it-works" className="lp-section lp-section--alt" aria-labelledby="hiw-heading">
          <div className="lp-section-inner">
            <div className="lp-section-head">
              <p className="lp-section-kicker">Get started in minutes</p>
              <h2 id="hiw-heading" className="lp-section-title">How it works</h2>
              <p className="lp-section-sub">
                Four steps from zero to fully set up.
              </p>
            </div>
            <ol className="lp-steps" aria-label="Steps">
              {STEPS.map(({ num, title, body }) => (
                <li key={num} className="lp-step">
                  <span className="lp-step-num" aria-hidden="true">{num}</span>
                  <div className="lp-step-text">
                    <strong className="lp-step-title">{title}</strong>
                    <p className="lp-step-body">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ════ TESTIMONIALS ════════════════════════════════════════ */}
        <section id="testimonials" className="lp-section" aria-labelledby="testi-heading">
          <div className="lp-section-inner">
            <div className="lp-section-head">
              <p className="lp-section-kicker">From students</p>
              <h2 id="testi-heading" className="lp-section-title">What your batchmates say</h2>
            </div>
            <ul className="lp-testi-grid" aria-label="Testimonials">
              {TESTIMONIALS.map(({ quote, name, role }) => (
                <li key={name} className="lp-testi-card">
                  <svg className="lp-testi-quote" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"
                      fill="currentColor"/>
                  </svg>
                  <p className="lp-testi-text">{quote}</p>
                  <footer className="lp-testi-footer">
                    <span className="lp-testi-name">{name}</span>
                    <span className="lp-testi-role">{role}</span>
                  </footer>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ════ FOOTER CTA ══════════════════════════════════════════ */}
        <section className="lp-footer-cta" aria-label="Get started">
          <div className="lp-footer-cta-inner">
            <h2 className="lp-footer-cta-title">Ready to take control of your semester?</h2>
            <p className="lp-footer-cta-sub">Free for students. Open in your browser — no install needed.</p>
            <Link to={APP_BASE} className="lp-btn lp-btn--primary">
              Open student portal
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
