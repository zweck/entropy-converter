import { useRef, useEffect } from 'react';
import { useReducedMotion } from '../lib/hooks';

/**
 * Fixed, full-viewport animated starfield with a slow nebula drift.
 * Pure canvas2d — cheap, runs behind all content. Pauses when the tab
 * is hidden and respects prefers-reduced-motion (renders a static frame).
 */
export default function Starfield() {
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let w = 0, h = 0, dpr = 1;
    let stars = [];

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(220, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.8 + 0.2,
        r: Math.random() * 1.3 + 0.3,
        tw: Math.random() * Math.PI * 2,
        hue: Math.random(),
      }));
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(time * 0.001 * s.z + s.tw);
        const past = s.hue < 0.4;
        const col = past
          ? `rgba(255, 180, 120, ${0.5 * twinkle * s.z})`
          : s.hue < 0.7
            ? `rgba(120, 200, 255, ${0.6 * twinkle * s.z})`
            : `rgba(180, 150, 255, ${0.6 * twinkle * s.z})`;
        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced) {
          s.y += s.z * 0.04;
          if (s.y > h + 2) s.y = -2;
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    build();
    draw(0);

    const onResize = () => build();
    window.addEventListener('resize', onResize);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
