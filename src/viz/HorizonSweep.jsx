import { useRef, useEffect } from 'react';
import { useReducedMotion } from '../lib/hooks';

/**
 * Signature hero animation. Possibilities (cyan→violet) drift in from the
 * future on the right, jittering with informational entropy. They cross a
 * glowing vertical "now-horizon" and crystallise into fixed orange records
 * of the past on the left. Expresses the core model: irreversible conversion
 * of informational entropy into thermodynamic entropy at the present frontier.
 */
export default function HorizonSweep() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0, w = 0, h = 0, dpr = 1, t = 0;
    let particles = [];

    const NOW = () => w * 0.5;

    const spawn = () => ({
      x: w + Math.random() * w * 0.5,
      y: Math.random() * h,
      vy: (Math.random() - 0.5) * 0.5,
      speed: 0.4 + Math.random() * 1.1,
      r: 0.8 + Math.random() * 2.2,
      hue: Math.random(),
      frozen: false,
      fx: 0, fy: 0,
      phase: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(160, Math.floor((w * h) / 5200));
      particles = Array.from({ length: count }, () => {
        const p = spawn();
        p.x = Math.random() * w;
        if (p.x < NOW()) {
          p.frozen = true;
          p.fx = p.x; p.fy = p.y;
        }
        return p;
      });
    };

    const futureColor = (hue, a) =>
      hue < 0.5
        ? `rgba(76, 201, 240, ${a})`
        : `rgba(150, 120, 255, ${a})`;

    const draw = () => {
      t += reduced ? 0 : 1;
      ctx.clearRect(0, 0, w, h);
      const now = NOW();

      // now-horizon glow
      const grad = ctx.createLinearGradient(now - 60, 0, now + 60, 0);
      grad.addColorStop(0, 'rgba(123, 92, 255, 0)');
      grad.addColorStop(0.5, 'rgba(220, 235, 255, 0.16)');
      grad.addColorStop(1, 'rgba(255, 176, 86, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(now - 60, 0, 120, h);
      ctx.strokeStyle = 'rgba(235, 245, 255, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(now, 0);
      ctx.lineTo(now, h);
      ctx.stroke();

      for (const p of particles) {
        if (p.frozen) {
          // settled past record
          const jiggle = reduced ? 0 : Math.sin(t * 0.01 + p.phase) * 0.3;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, ${150 + p.hue * 40}, ${70 + p.hue * 30}, 0.85)`;
          ctx.arc(p.fx, p.fy + jiggle, p.r * 0.9, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        // drifting future possibility
        if (!reduced) {
          p.x -= p.speed;
          p.y += p.vy + Math.sin(t * 0.02 + p.phase) * 0.4;
        }
        if (p.x <= now) {
          p.frozen = true;
          p.fx = now - Math.random() * (now * 0.92);
          p.fy = p.y;
        }
        const a = 0.5 + 0.4 * Math.sin(t * 0.03 + p.phase);
        ctx.beginPath();
        ctx.fillStyle = futureColor(p.hue, a);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // recycle: keep population balanced by respawning some frozen ones from the right
      if (!reduced && t % 6 === 0) {
        const frozenCount = particles.filter((p) => p.frozen).length;
        if (frozenCount > particles.length * 0.62) {
          const victim = particles.find((p) => p.frozen);
          if (victim) Object.assign(victim, spawn());
        }
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  return (
    <div className="horizon-sweep">
      <canvas ref={ref} aria-hidden="true" />
      <div className="horizon-sweep__labels">
        <span className="hs-past">PAST · committed records</span>
        <span className="hs-now">NOW</span>
        <span className="hs-future">FUTURE · open possibilities</span>
      </div>
    </div>
  );
}
