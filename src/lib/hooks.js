import { useState, useEffect, useRef } from 'react';

/** True when the user prefers reduced motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

/**
 * Mounts heavy children only once the element scrolls near the viewport.
 * Returns [ref, mounted]. Stays mounted after first reveal to avoid
 * re-initialising expensive WebGL/canvas contexts on every pass.
 */
export function useInViewMount(rootMargin = '300px') {
  const ref = useRef(null);
  // Mount immediately when IntersectionObserver is unavailable (e.g. SSR/old
  // browsers); otherwise wait until the element scrolls near the viewport.
  const [mounted, setMounted] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );
  useEffect(() => {
    if (mounted || !ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [mounted, rootMargin]);
  return [ref, mounted];
}

/** Tracks a CSS media query, returning a boolean. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, [query]);
  return matches;
}
