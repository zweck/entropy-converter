import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';

import Starfield from './viz/Starfield';
import Hero from './sections/Hero';
import { Narrative } from './sections/Narrative';
import { NAV } from './sections/nav';
import './App.css';

// react-markdown + KaTeX are sizeable; split the paper into its own chunk.
const Paper = lazy(() => import('./components/Paper'));

/* Top scroll-progress bar coloured along the time gradient. */
function ProgressRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  return <motion.div className="progress-rail" style={{ scaleX }} aria-hidden="true" />;
}

/* Vertical dot navigation that highlights the section in view. */
function SideNav() {
  const [active, setActive] = useState(NAV[0].id);
  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="side-nav" aria-label="Section navigation">
      {NAV.map((n) => (
        <a
          key={n.id}
          href={`#${n.id}`}
          className={`side-nav__item ${active === n.id ? 'is-active' : ''}`}
        >
          <span className="side-nav__dot" />
          <span className="side-nav__label">{n.label}</span>
        </a>
      ))}
    </nav>
  );
}

/* Compact top bar: brand + jump-to-paper. Hides on scroll-down. */
function TopBar() {
  const [hidden, setHidden] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 120 && y > last);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const onPaper = pathname === '/paper';
  return (
    <header className={`topbar ${hidden ? 'topbar--hidden' : ''}`}>
      <Link to="/" className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true" />
        Entropy&nbsp;· Time
      </Link>
      {onPaper ? (
        <Link to="/" className="topbar__link">← Back to the story</Link>
      ) : (
        <Link to="/paper" className="topbar__link">Paper &amp; audio →</Link>
      )}
    </header>
  );
}

/* Reset scroll position whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* Closing hand-off from the scroll story to the full manuscript. */
function PaperHandoff() {
  return (
    <section className="paper-cta">
      <div className="paper-cta__inner">
        <p className="eyebrow"><span className="eyebrow__num">10</span>The full text</p>
        <h2 className="scene__title">Read, listen, or download the paper</h2>
        <p className="lede">
          The complete v3 manuscript — emergent temporality, relativistic dilation, and
          dark matter from information thermodynamics — with section-by-section
          text-to-speech and a PDF download.
        </p>
        <Link to="/paper" className="btn btn--primary">Open the paper →</Link>
      </div>
    </section>
  );
}

/* Page 1 — the scrollytelling narrative. */
function Home({ t, setT }) {
  return (
    <>
      <ProgressRail />
      <SideNav />
      <main className="site__main">
        <Hero />
        <Narrative t={t} setT={setT} />
        <PaperHandoff />
      </main>
    </>
  );
}

/* Page 2 — the full paper. */
function PaperPage() {
  return (
    <main className="site__main paper-page">
      <div className="paper-page__top">
        <Link to="/" className="paper-back">← Back to the story</Link>
      </div>
      <Suspense fallback={<div className="paper-loading">loading manuscript…</div>}>
        <Paper />
      </Suspense>
    </main>
  );
}

export default function App() {
  // Shared timeline scalar t ∈ [0,1] driving the three time-linked instruments.
  const [t, setT] = useState(0);

  return (
    <div className="site">
      <Starfield />
      <TopBar />
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home t={t} setT={setT} />} />
        <Route path="/paper" element={<PaperPage />} />
        <Route path="*" element={<Home t={t} setT={setT} />} />
      </Routes>

      <footer className="site-footer">
        <p>Time as Observation-Limited Entropy Conversion · Philip J. Hauser</p>
        <p className="site-footer__dim">
          Past is committed. Future is open. The now-horizon is where the cost is paid.
        </p>
      </footer>
    </div>
  );
}
