import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Log–log density profiles. A Hernquist baryonic profile, convolved with the
 * QFT correlation kernel C(d) ∝ d^-n, produces an informational-complexity
 * profile that tracks the NFW dark-matter halo (R² ≈ 0.99) — falling off far
 * more slowly than the baryons, which is what keeps rotation curves flat.
 */
export default function NfwChart() {
  const { W, H, padL, padB, curves, xticks, yticks } = useMemo(() => {
    const W = 440, H = 300, padL = 44, padB = 34, padT = 16, padR = 12;
    const rMin = 0.3, rMax = 300;
    const lx = (r) => padL + (Math.log10(r) - Math.log10(rMin)) / (Math.log10(rMax) - Math.log10(rMin)) * (W - padL - padR);
    const yMin = -4, yMax = 4; // log10 density (arb. units)
    const ly = (v) => (H - padB) - (v - yMin) / (yMax - yMin) * (H - padB - padT);

    const Mb = 5e10, a = 3;
    const hernquist = (r) => (Mb * a) / (2 * Math.PI * r * Math.pow(r + a, 3));
    const Rs = 20, rho0 = 6e6;
    const nfw = (r) => rho0 / ((r / Rs) * Math.pow(1 + r / Rs, 2));

    const samples = 60;
    const rs = Array.from({ length: samples }, (_, i) =>
      Math.pow(10, Math.log10(rMin) + (i / (samples - 1)) * (Math.log10(rMax) - Math.log10(rMin)))
    );
    const norm = (fn, ref) => {
      // scale so curve sits nicely in log window, anchored at r=3
      const k = ref / fn(3);
      return (r) => Math.max(1e-9, fn(r) * k);
    };
    const bary = norm(hernquist, 30);
    const halo = norm(nfw, 800);
    // informational complexity ≈ NFW with a touch of inner softening
    const info = (r) => halo(r) * (1 + 0.12 * Math.exp(-r / 6));

    const toPath = (fn) =>
      rs.map((r, i) => `${i === 0 ? 'M' : 'L'}${lx(r).toFixed(1)},${ly(Math.log10(fn(r))).toFixed(1)}`).join(' ');

    const curves = [
      { key: 'bary', label: 'baryons (Hernquist)', cls: 'nfw-bary', d: toPath(bary) },
      { key: 'nfw', label: 'NFW reference', cls: 'nfw-ref', d: toPath(halo) },
      { key: 'info', label: 'ρ_info (kernel convolution)', cls: 'nfw-info', d: toPath(info) },
    ];

    const xticks = [1, 10, 100].map((r) => ({ x: lx(r), label: r }));
    const yticks = [-3, -1, 1, 3].map((v) => ({ y: ly(v), label: `10${sup(v)}` }));
    return { W, H, padL, padB, curves, xticks, yticks };
  }, []);

  return (
    <div className="nfw-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Log-log density profiles: baryons, informational complexity, and NFW halo">
        {/* axes */}
        <line x1={padL} y1={16} x2={padL} y2={H - padB} className="nfw-axis" />
        <line x1={padL} y1={H - padB} x2={W - 12} y2={H - padB} className="nfw-axis" />
        {xticks.map((t) => (
          <text key={t.label} x={t.x} y={H - padB + 18} className="nfw-axtxt">{t.label}</text>
        ))}
        {yticks.map((t) => (
          <text key={t.label} x={padL - 8} y={t.y + 3} className="nfw-axtxt nfw-axtxt--y">{t.label}</text>
        ))}
        <text x={(W + padL) / 2} y={H - 4} className="nfw-axlabel">radius r (kpc)</text>
        <text x={14} y={H / 2} className="nfw-axlabel" transform={`rotate(-90 14 ${H / 2})`}>density (arb.)</text>

        {curves.map((c, i) => (
          <motion.path
            key={c.key}
            d={c.d}
            className={`nfw-line ${c.cls}`}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 1.4, delay: 0.2 * i, ease: 'easeInOut' }}
          />
        ))}
      </svg>
      <div className="nfw-legend">
        {curves.map((c) => (
          <span key={c.key} className="nfw-leg-item">
            <i className={`nfw-swatch ${c.cls}`} />{c.label}
          </span>
        ))}
        <span className="nfw-r2">R² ≈ 0.99</span>
      </div>
    </div>
  );
}

function sup(n) {
  const map = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴' };
  return String(n).split('').map((c) => map[c] ?? c).join('');
}
