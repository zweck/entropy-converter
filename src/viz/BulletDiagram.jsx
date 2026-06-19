import { motion } from 'framer-motion';

/**
 * The Bullet Cluster. Ram-pressure strips the hot X-ray gas (pink, ~87% of
 * baryons) and leaves it lagging behind the collisionless galaxies (white).
 * Gravitational-lensing convergence κ (cyan contours) peaks on the galaxies.
 * In the framework, the shocked gas writes irreversible records (low coherence
 * η), so ρ_info follows the high-η stars — tracking κ, not the gas.
 */
export default function BulletDiagram() {
  const reveal = {
    initial: { opacity: 0, scale: 0.9 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, margin: '-20%' },
  };
  return (
    <svg viewBox="0 0 440 240" className="bullet-svg" role="img"
         aria-label="Bullet Cluster: lensing peaks track galaxies, offset from gas">
      <defs>
        <radialGradient id="gasGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,110,180,0.55)" />
          <stop offset="70%" stopColor="rgba(255,110,180,0.18)" />
          <stop offset="100%" stopColor="rgba(255,110,180,0)" />
        </radialGradient>
        <radialGradient id="kGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(76,201,240,0.0)" />
          <stop offset="60%" stopColor="rgba(76,201,240,0.0)" />
          <stop offset="100%" stopColor="rgba(76,201,240,0.0)" />
        </radialGradient>
      </defs>

      {/* gas clouds (displaced toward centre after collision) */}
      <motion.ellipse {...reveal} transition={{ duration: 0.8 }} cx="175" cy="120" rx="55" ry="46" fill="url(#gasGrad)" />
      <motion.ellipse {...reveal} transition={{ duration: 0.8, delay: 0.1 }} cx="275" cy="120" rx="42" ry="38" fill="url(#gasGrad)" />

      {/* lensing convergence contours on galaxies (offset outward) */}
      {[26, 20, 14].map((r, i) => (
        <g key={`l${i}`}>
          <motion.circle {...reveal} transition={{ duration: 0.7, delay: 0.3 + i * 0.08 }}
            cx="95" cy="120" r={r} className="bullet-kappa" />
          <motion.circle {...reveal} transition={{ duration: 0.7, delay: 0.3 + i * 0.08 }}
            cx="355" cy="120" r={r} className="bullet-kappa" />
        </g>
      ))}

      {/* galaxies (collisionless) */}
      {[[95, 120], [355, 120]].map(([cx, cy], gi) =>
        [...Array(7)].map((_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <motion.circle key={`g${gi}-${i}`} {...reveal}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.03 }}
              cx={cx + Math.cos(a) * (8 + (i % 3) * 5)}
              cy={cy + Math.sin(a) * (8 + (i % 3) * 5)}
              r="2.4" className="bullet-galaxy" />
          );
        })
      )}

      <text x="225" y="120" className="bullet-tag bullet-tag--gas">gas (X-ray, low η)</text>
      <text x="95" y="166" className="bullet-tag bullet-tag--gal">galaxies · κ peak</text>
      <text x="355" y="166" className="bullet-tag bullet-tag--gal">galaxies · κ peak</text>
      <text x="220" y="24" className="bullet-title">lensing tracks the stars, not the gas</text>
    </svg>
  );
}
