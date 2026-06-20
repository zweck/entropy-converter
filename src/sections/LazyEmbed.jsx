import { Suspense } from 'react';
import { useInViewMount } from '../lib/hooks';

/**
 * Mounts a heavy interactive child (Three.js / canvas) only once it scrolls
 * near the viewport, so several can coexist on one scrolling page without all
 * spinning up at load. Shows a quiet placeholder until then.
 *
 * - Default (fixed): a definite height so `height:100%` canvases fill it.
 * - `auto`: grows with its content — for data panels (SPARC/KiDS) that would
 *   otherwise be clipped by a fixed height.
 */
export default function LazyEmbed({ children, minHeight = '70vh', auto = false }) {
  const [ref, mounted] = useInViewMount('400px');
  const style = auto
    ? { minHeight }
    : { height: minHeight, minHeight: '360px' };
  return (
    <div
      ref={ref}
      className={`lazy-embed ${auto ? 'lazy-embed--auto' : ''}`}
      style={style}
    >
      {mounted ? (
        <Suspense fallback={<EmbedSkeleton />}>{children}</Suspense>
      ) : (
        <EmbedSkeleton />
      )}
    </div>
  );
}

function EmbedSkeleton() {
  return (
    <div className="embed-skeleton" aria-hidden="true">
      <span className="embed-skeleton__pulse" />
      <span className="embed-skeleton__text">loading visualization…</span>
    </div>
  );
}
