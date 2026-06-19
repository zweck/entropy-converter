import { Suspense } from 'react';
import { useInViewMount } from '../lib/hooks';

/**
 * Mounts a heavy interactive child (Three.js / canvas) only once it scrolls
 * near the viewport, so several can coexist on one scrolling page without all
 * spinning up at load. Shows a quiet placeholder until then.
 */
export default function LazyEmbed({ children, minHeight = '70vh' }) {
  const [ref, mounted] = useInViewMount('400px');
  return (
    <div ref={ref} className="lazy-embed" style={{ height: minHeight, minHeight: '360px' }}>
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
