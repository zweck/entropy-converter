import { useReducedMotion } from '../lib/hooks';

function Clock({ x, label, rate, depth }) {
  const reduced = useReducedMotion();
  const dur = 6 / rate; // deeper well → slower hand
  return (
    <g transform={`translate(${x}, ${110 + depth})`}>
      <circle r="34" className="dl-clock-face" />
      <circle r="34" className="dl-clock-ring" />
      {[...Array(12)].map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={Math.sin(a) * 28}
            y1={-Math.cos(a) * 28}
            x2={Math.sin(a) * 31}
            y2={-Math.cos(a) * 31}
            className="dl-tick"
          />
        );
      })}
      {/* Native SVG rotate about the clock's local origin (0,0) — unambiguous
          across browsers, unlike a CSS transform-origin on the line's bbox. */}
      <line x1="0" y1="7" x2="0" y2="-24" className="dl-hand">
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur={`${dur}s`}
            repeatCount="indefinite"
          />
        )}
      </line>
      <circle r="3" className="dl-hub" />
      <text y="58" className="dl-label">{label}</text>
      <text y="74" className="dl-rate">dτ/dt = {rate.toFixed(2)}</text>
    </g>
  );
}

/**
 * Three observers at increasing gravitational depth. Deeper in the well the
 * local temperature rises (Tolman–Ehrenfest), each committed bit costs more
 * (Landauer), the now-horizon advances slower — clocks tick slower.
 */
export default function DilationDiagram() {
  return (
    <svg viewBox="0 0 420 320" className="dilation-svg" role="img"
         aria-label="Clocks ticking slower deeper in a gravity well">
      <defs>
        <linearGradient id="dl-well" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(76,201,240,0.10)" />
          <stop offset="100%" stopColor="rgba(255,94,98,0.18)" />
        </linearGradient>
      </defs>
      {/* gravity well */}
      <path
        d="M10,70 C120,70 150,250 210,250 C270,250 300,70 410,70 L410,310 L10,310 Z"
        fill="url(#dl-well)"
        stroke="rgba(125,150,255,0.2)"
        strokeWidth="1"
      />
      <text x="210" y="300" className="dl-well-label">gravitational potential well</text>
      <Clock x={70} label="far away" rate={1.0} depth={-30} />
      <Clock x={210} label="deep" rate={0.45} depth={110} />
      <Clock x={350} label="near" rate={0.78} depth={20} />
    </svg>
  );
}
