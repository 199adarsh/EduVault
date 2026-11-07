import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import { APP_BASE } from '../../config/appPaths';
import './LandingPage.css';

/* ─── Lenis smooth scroll initialisation ───────────────────────────── */
function useLenis(reduceMotion) {
  useEffect(() => {
    if (reduceMotion) return;
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    // Expose so pill-nav can scroll to sections
    window.__lenis = lenis;
    return () => { cancelAnimationFrame(raf); lenis.destroy(); window.__lenis = null; };
  }, [reduceMotion]);
}

/* ─── Scroll-reveal wrapper ─────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '', as = 'div', y = 24 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Tag>
  );
}

/* ─── Data ──────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Home',         href: '#hero'         },
  { label: 'Features',     href: '#features'     },
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
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 12h6M9 16h4M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 4a2 2 0 0 1 4 0v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: 'Notes & vault',
    body: 'Write, organise, and retrieve notes per subject. Full-text search across every semester.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><path d="M8 14l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: 'Attendance heatmap',
    body: 'See your attendance % per subject on a colour-coded calendar. Know your bunk budget instantly.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: 'Live notices',
    body: 'Exam schedules, holiday lists, and college circulars pushed to one scrollable feed.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: 'Academic roadmap',
    body: 'Map your subjects, deadlines, and milestones on a semester-long planner.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: 'One-screen dashboard',
    body: 'Everything visible at a glance — no tabs, no switching apps, no context loss.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: 'Your data, private',
    body: 'Everything stays in your account. No ads, no tracking, no sharing with third parties.',
  },
];

const STEPS = [
  { num: '01', title: 'Open the portal',       body: 'Sign in with your college email in one click — no installs, no setup.' },
  { num: '02', title: 'Set up your subjects',  body: 'Add subjects, credit counts, and professors. Takes about two minutes.' },
  { num: '03', title: 'Log attendance daily',  body: 'Mark present or absent after each lecture. The heatmap updates live.' },
  { num: '04', title: 'Stay on top all semester', body: 'Check notices, write notes, track your roadmap — everything in one place.' },
];

const TESTIMONIALS = [
  { quote: "Finally stopped using five different apps. CampusAxis has my attendance, notes, and notices all in one spot.", name: 'Riya M.', role: 'SE Computer Engineering' },
  { quote: "The bunk budget feature literally saved my attendance twice this semester. I always know exactly how many classes I can miss.", name: 'Aditya K.', role: 'TE Electronics' },
  { quote: "Super clean UI. It doesn't feel like a college tool — it feels like a proper product.", name: 'Sneha P.', role: 'BE IT' },
];

const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',     href: '#features'     },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Testimonials', href: '#testimonials' },
      { label: 'Open portal',  href: APP_BASE        },
    ],
  },
  {
    heading: 'Info',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of use',   href: '/terms' },
      { label: 'Contact',        href: 'mailto:support@campusaxis.app' },
    ],
  },
];

/* ─── Liquid-glass pill navbar ───────────────────────────────────────
   The iOS-style effect: a glass background pill slides between items
   using a measured layoutId animation via Framer Motion.
──────────────────────────────────────────────────────────────────── */
function PillNav({ scrolled, activeSection, onNavClick }) {
  return (
    <nav
      className={`lp-pill-nav ${scrolled ? 'lp-pill-nav--scrolled' : ''}`}
      aria-label="Site navigation"
    >
      <div className="lp-pill-nav-inner">
        {/* Links with sliding glass indicator */}
        <ul className="lp-pill-links" role="list">
          {NAV_LINKS.map(({ label, href }) => {
            const id       = href.replace('#', '');
            const isActive = activeSection === id;
            return (
              <li key={href} className="lp-pill-li">
                {/* iOS liquid-glass sliding background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="glass-bg"
                      layoutId="pill-glass"
                      className="lp-pill-glass-bg"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                </AnimatePresence>
                <a
                  href={href}
                  onClick={(e) => onNavClick(e, href)}
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
  );
}

/* ─── Component ─────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [entered,       setEntered]       = useState(false);
  const [reduceMotion,  setReduceMotion]  = useState(false);
  const [scrolled,      setScrolled]      = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  /* Lenis smooth scroll */
  useLenis(reduceMotion);

  /* Scroll-based navbar visibility */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Active section via IntersectionObserver */
  useEffect(() => {
    const ids  = ['hero', 'features', 'how-it-works', 'testimonials'];
    const obs  = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); }); },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  /* Entrance + reduced-motion */
  useEffect(() => {
    document.title = 'CampusAxis | Student academic portal';
    const mq   = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => { cancelAnimationFrame(id); mq.removeEventListener?.('change', sync); };
  }, []);

  /* Smooth scroll — delegates to Lenis when available */
  const scrollTo = (e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    if (window.__lenis) window.__lenis.scrollTo(target, { offset: -80, duration: 1.2 });
    else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`lp ${entered ? 'lp--in' : ''}`}>
      <div className="lp-atmosphere" aria-hidden="true" />
      <div className="lp-dotgrid"    aria-hidden="true" />

      {/* ── Liquid glass floating pill navbar (always visible) ── */}
      <PillNav scrolled={scrolled} activeSection={activeSection} onNavClick={scrollTo} />

      <main className="lp-main">

        {/* ════ HERO ══════════════════════════════════════════════════ */}
        <section id="hero" className="lp-hero" aria-labelledby="lp-brand">

          <div className="lp-copy">
            {/* Value pills */}
            <motion.div
              className="lp-value-pills"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Key value props"
            >
              <span className="lp-value-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Instant setup
              </span>
              <span className="lp-value-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Private &amp; secure
              </span>
              <span className="lp-value-pill lp-value-pill--accent">Free for students</span>
            </motion.div>

            <motion.p
              className="lp-kicker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              Student academic portal
            </motion.p>

            <motion.h1
              id="lp-brand"
              className="lp-brand"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              Your campus,<br />
              <span className="lp-brand-accent">one screen.</span>
            </motion.h1>

            <motion.p
              className="lp-lede"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              Notes, attendance, notices, and roadmaps — everything your semester needs, in one place.
            </motion.p>

            <motion.div
              className="lp-actions"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to={APP_BASE} className="lp-btn lp-btn--primary">Open student portal</Link>
              <a href="#features" className="lp-btn lp-btn--ghost" onClick={(e) => scrollTo(e, '#features')}>See features</a>
            </motion.div>

            <motion.ul
              className="lp-features"
              aria-label="Key features"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.54, ease: [0.22, 1, 0.36, 1] }}
            >
              {HERO_FEATURES.map(({ icon, label, desc }) => (
                <li key={label} className="lp-feature">
                  <span className="lp-feature-icon">{icon}</span>
                  <span className="lp-feature-text">
                    <strong className="lp-feature-label">{label}</strong>
                    <span className="lp-feature-desc">{desc}</span>
                  </span>
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Right product panel */}
          <motion.div
            className="lp-stage"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Floating stat cards */}
            <div className="lp-stat-card lp-stat-card--tl" aria-label="Attendance stat">
              <span className="lp-stat-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <div className="lp-stat-body">
                <span className="lp-stat-value">87.5%</span>
                <span className="lp-stat-label">Attendance</span>
              </div>
              <span className="lp-stat-badge lp-stat-badge--green">On track</span>
            </div>

            <div className="lp-stat-card lp-stat-card--br" aria-label="Subjects">
              <span className="lp-stat-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <div className="lp-stat-body">
                <span className="lp-stat-value">12</span>
                <span className="lp-stat-label">Subjects</span>
              </div>
            </div>

            <div className="lp-stat-card lp-stat-card--bc" aria-label="Notices">
              <span className="lp-stat-icon lp-stat-icon--blue">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <div className="lp-stat-body">
                <span className="lp-stat-value">3 new</span>
                <span className="lp-stat-label">Notices today</span>
              </div>
            </div>

            <div className="lp-screen">
              <video className="lp-media" autoPlay muted loop playsInline width={1280} height={800}
                aria-label="CampusAxis desktop product walkthrough">
                <source src="/hero/campusaxis-desktop.webm" type="video/webm" />
                <source src="/hero/campusaxis-desktop.mp4"  type="video/mp4"  />
              </video>
            </div>
          </motion.div>
        </section>

        {/* ════ FEATURES ══════════════════════════════════════════════ */}
        <section id="features" className="lp-section" aria-labelledby="features-heading">
          <div className="lp-section-inner">
            <Reveal className="lp-section-head">
              <p className="lp-section-kicker">Everything you need</p>
              <h2 id="features-heading" className="lp-section-title">Built for the whole semester</h2>
              <p className="lp-section-sub">Six tools, one surface. No switching between apps halfway through a lecture.</p>
            </Reveal>
            <ul className="lp-feat-grid" aria-label="Features">
              {FEATURES_GRID.map(({ icon, title, body }, i) => (
                <Reveal as="li" key={title} className="lp-feat-card" delay={i * 0.07}>
                  <span className="lp-feat-icon">{icon}</span>
                  <strong className="lp-feat-title">{title}</strong>
                  <p className="lp-feat-body">{body}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ════ HOW IT WORKS ══════════════════════════════════════════ */}
        <section id="how-it-works" className="lp-section lp-section--alt" aria-labelledby="hiw-heading">
          <div className="lp-section-inner">
            <Reveal className="lp-section-head">
              <p className="lp-section-kicker">Get started in minutes</p>
              <h2 id="hiw-heading" className="lp-section-title">How it works</h2>
              <p className="lp-section-sub">Four steps from zero to fully set up.</p>
            </Reveal>
            <ol className="lp-steps" aria-label="Steps">
              {STEPS.map(({ num, title, body }, i) => (
                <Reveal as="li" key={num} className="lp-step" delay={i * 0.1}>
                  <span className="lp-step-num" aria-hidden="true">{num}</span>
                  <div className="lp-step-text">
                    <strong className="lp-step-title">{title}</strong>
                    <p className="lp-step-body">{body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ════ TESTIMONIALS ══════════════════════════════════════════ */}
        <section id="testimonials" className="lp-section" aria-labelledby="testi-heading">
          <div className="lp-section-inner">
            <Reveal className="lp-section-head">
              <p className="lp-section-kicker">From students</p>
              <h2 id="testi-heading" className="lp-section-title">What your batchmates say</h2>
            </Reveal>
            <ul className="lp-testi-grid" aria-label="Testimonials">
              {TESTIMONIALS.map(({ quote, name, role }, i) => (
                <Reveal as="li" key={name} className="lp-testi-card" delay={i * 0.1}>
                  <svg className="lp-testi-quote" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill="currentColor"/>
                  </svg>
                  <p className="lp-testi-text">{quote}</p>
                  <footer className="lp-testi-footer">
                    <span className="lp-testi-name">{name}</span>
                    <span className="lp-testi-role">{role}</span>
                  </footer>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ════ FOOTER ════════════════════════════════════════════════ */}
        <footer className="lp-footer" aria-label="Site footer">
          {/* Pre-footer CTA band */}
          <Reveal className="lp-prefooter">
            <div className="lp-prefooter-inner">
              <div className="lp-prefooter-copy">
                <h2 className="lp-prefooter-title">Ready to own your semester?</h2>
                <p className="lp-prefooter-sub">Free for students. Runs in your browser. No install, no nonsense.</p>
              </div>
              <Link to={APP_BASE} className="lp-btn lp-btn--primary lp-prefooter-cta">
                Open student portal
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </Reveal>

          {/* Main footer grid */}
          <div className="lp-footer-main">
            <div className="lp-footer-inner">
              {/* Brand column */}
              <div className="lp-footer-brand-col">
                <Link to="/" className="lp-footer-logo" aria-label="CampusAxis home">
                  <img src="/favicon.png" alt="" width={30} height={30} className="lp-footer-logo-mark" />
                  <span>CampusAxis</span>
                </Link>
                <p className="lp-footer-tagline">
                  The academic portal built for Indian engineering students. One screen, all semester.
                </p>
                <div className="lp-footer-badges">
                  <span className="lp-footer-badge">⚡ Free</span>
                  <span className="lp-footer-badge">🔒 Private</span>
                  <span className="lp-footer-badge">🌐 Web-only</span>
                </div>
              </div>

              {/* Link columns */}
              {FOOTER_LINKS.map(({ heading, links }) => (
                <div key={heading} className="lp-footer-link-col">
                  <p className="lp-footer-col-heading">{heading}</p>
                  <ul className="lp-footer-link-list" role="list">
                    {links.map(({ label, href }) => (
                      <li key={label}>
                        {href.startsWith('#') ? (
                          <a href={href} className="lp-footer-link" onClick={(e) => scrollTo(e, href)}>{label}</a>
                        ) : href.startsWith('/') ? (
                          <Link to={href} className="lp-footer-link">{label}</Link>
                        ) : (
                          <a href={href} className="lp-footer-link">{label}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="lp-footer-bar">
              <p className="lp-footer-copy">&copy; {new Date().getFullYear()} CampusAxis. Made for students.</p>
              <div className="lp-footer-bar-links">
                <Link to="/privacy" className="lp-footer-bar-link">Privacy</Link>
                <Link to="/terms" className="lp-footer-bar-link">Terms</Link>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
