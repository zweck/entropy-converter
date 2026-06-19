import { motion } from 'framer-motion';

/**
 * The conserved entropy budget. As t goes 0 → 1 (Big Bang → heat death),
 * informational entropy S_info (the open future) is converted into
 * thermodynamic entropy S_therm (the fixed past). The total is constant.
 * `t` is a scalar in [0, 1] supplied by the surrounding scroll section.
 */
export default function EntropyBudget({ t = 0 }) {
  const clamped = Math.max(0, Math.min(1, t));
  // ease so the conversion feels physical (slow start, accelerating)
  const therm = clamped;
  const infoPct = Math.round((1 - therm) * 100);
  const thermPct = Math.round(therm * 100);

  return (
    <div className="entropy-budget">
      <div className="eb-bar" role="img" aria-label={`Informational entropy ${infoPct}%, thermodynamic entropy ${thermPct}%`}>
        <motion.div
          className="eb-seg eb-info"
          animate={{ flexGrow: 1 - therm }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        >
          <span className="eb-seg__label">
            S<sub>info</sub>
            <em>future · possibilities</em>
          </span>
        </motion.div>
        <div className="eb-now" aria-hidden="true" />
        <motion.div
          className="eb-seg eb-therm"
          animate={{ flexGrow: therm }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        >
          <span className="eb-seg__label eb-seg__label--right">
            S<sub>therm</sub>
            <em>past · records</em>
          </span>
        </motion.div>
      </div>

      <div className="eb-readout">
        <span className="eb-val eb-val--info">{infoPct}%</span>
        <span className="eb-eq">S<sub>info</sub> + S<sub>therm</sub> = const</span>
        <span className="eb-val eb-val--therm">{thermPct}%</span>
      </div>

      <div className="eb-axis">
        <span>Big Bang</span>
        <span className="eb-axis__mid">the now-horizon advances →</span>
        <span>Heat Death</span>
      </div>
    </div>
  );
}
