import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import HorizonSweep from '../viz/HorizonSweep';

const easeOut = [0.22, 1, 0.36, 1];

export default function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero__viz">
        <HorizonSweep />
      </div>
      <div className="hero__gradient" aria-hidden="true" />

      <div className="hero__content">
        <motion.p
          className="hero__eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          Information Thermodynamics · Philip J. Hauser
        </motion.p>

        <motion.h1
          className="hero__title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: easeOut }}
        >
          Time as Observation-Limited<br />Entropy Conversion
        </motion.h1>

        <motion.p
          className="hero__sub"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: easeOut }}
        >
          What if time is not a backdrop but a <em>process</em> — the irreversible
          conversion of unobserved possibility into fixed record? Follow the
          now-horizon from the Big Bang to heat death, and watch the same idea
          reproduce relativistic time dilation and dark matter.
        </motion.p>

        <motion.div
          className="hero__cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: easeOut }}
        >
          <a className="btn btn--primary" href="#premise">Begin the descent</a>
          <Link className="btn btn--ghost" to="/paper">Read the paper</Link>
        </motion.div>
      </div>

      <motion.a
        href="#premise"
        className="hero__scroll"
        aria-label="Scroll to begin"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <span className="hero__scroll-dot" />
        <span className="hero__scroll-text">scroll</span>
      </motion.a>
    </header>
  );
}
