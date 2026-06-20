import { motion } from 'framer-motion';

const easeOut = [0.22, 1, 0.36, 1];

/** A full narrative scene with an anchor id and consistent layout. */
export function Scene({ id, tone = 'future', children, wide = false }) {
  return (
    <section id={id} className={`scene scene--${tone}`} data-scene={id}>
      <div className={`scene__inner ${wide ? 'scene__inner--wide' : ''}`}>{children}</div>
    </section>
  );
}

/** Fade/rise on enter. */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div' }) {
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12%' }}
      transition={{ duration: 0.7, delay, ease: easeOut }}
    >
      {children}
    </M>
  );
}

export function Eyebrow({ children, num }) {
  return (
    <Reveal as="p" className="eyebrow" y={16}>
      {num != null && <span className="eyebrow__num">{num}</span>}
      {children}
    </Reveal>
  );
}

export function Title({ children }) {
  return (
    <Reveal as="h2" className="scene__title" delay={0.05}>
      {children}
    </Reveal>
  );
}

export function Lede({ children }) {
  return (
    <Reveal as="p" className="lede" delay={0.1}>
      {children}
    </Reveal>
  );
}

export function Body({ children, delay = 0.15 }) {
  return (
    <Reveal as="p" className="body" delay={delay}>
      {children}
    </Reveal>
  );
}

export function Pull({ children }) {
  return (
    <Reveal className="pullquote" delay={0.1}>
      <span className="pullquote__mark" aria-hidden="true">“</span>
      <p>{children}</p>
    </Reveal>
  );
}

/** Row of highlight statistics. */
export function Stats({ items }) {
  return (
    <Reveal className="stats-row" delay={0.15}>
      {items.map((s, i) => (
        <div className="stat-card" key={i}>
          <span className="stat-card__value">{s.value}</span>
          <span className="stat-card__label">{s.label}</span>
        </div>
      ))}
    </Reveal>
  );
}

/** A framed, lazy-mounted interactive instrument with caption. */
export function Instrument({ label, hint, children, tall = false }) {
  return (
    <Reveal className={`instrument ${tall ? 'instrument--tall' : ''}`} delay={0.1} y={36}>
      <div className="instrument__bar">
        <span className="instrument__dot" aria-hidden="true" />
        <span className="instrument__label">{label}</span>
        {hint && <span className="instrument__hint">{hint}</span>}
      </div>
      <div className="instrument__stage">{children}</div>
    </Reveal>
  );
}

/** Inline pseudo-equation chip. */
export function Eq({ children }) {
  return <span className="eq-chip">{children}</span>;
}
