import { useRef, useState, lazy } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

import { Scene, Eyebrow, Title, Lede, Body, Pull, Stats, Instrument, Eq, Reveal } from './ui';
import LazyEmbed from './LazyEmbed';

import EntropyBudget from '../viz/EntropyBudget';
import DilationDiagram from '../viz/DilationDiagram';
import NfwChart from '../viz/NfwChart';
import BulletDiagram from '../viz/BulletDiagram';

// Heavy interactive instruments (Three.js / canvas) are code-split so they are
// never in the initial download — fetched on demand as the reader scrolls.
const EntropyVisualization = lazy(() => import('../components/EntropyVisualization'));
const BranchingSimulation = lazy(() => import('../components/BranchingSimulation'));
const CausalHorizonVisualization = lazy(() => import('../components/CausalHorizonVisualization'));
const CPUVisualization = lazy(() => import('../components/CPUVisualization'));
const SPARCResults = lazy(() => import('../components/SPARCResults'));
const KiDSResults = lazy(() => import('../components/KiDSResults'));

/* =========================================================
   1 — The premise (scroll-driven entropy budget)
   ========================================================= */
function Premise() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.35'],
  });
  const [t, setT] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setT(v));

  return (
    <Scene id="premise" tone="future">
      <Eyebrow num="01">Two entropies, one budget</Eyebrow>
      <Title>The future is open because it has not yet been observed</Title>
      <Lede>
        The universe carries a fixed budget of entropy, split in two.
        <strong> Informational entropy</strong> — the von Neumann entropy of everything
        unobserved — measures the openness of the future. <strong>Thermodynamic
        entropy</strong> is the record of the fixed past. Time is the irreversible
        conversion of the first into the second.
      </Lede>

      <div ref={ref} className="budget-block">
        <EntropyBudget t={t} />
        <Body delay={0.05}>
          Scroll, and the now-horizon advances. Possibilities collapse into records;
          the open future shrinks while the committed past grows — yet their sum never
          changes. This is the whole story, before any physics is added.
        </Body>
      </div>

      <Pull>
        Temporal evolution is the process by which S<sub>info</sub> is converted into
        S<sub>therm</sub> through irreversible observation.
      </Pull>
    </Scene>
  );
}

/* =========================================================
   2 — The now-horizon (interactive 3D)
   ========================================================= */
function NowHorizon({ t, setT }) {
  return (
    <Scene id="now-horizon" tone="now" wide>
      <Eyebrow num="02">The present frontier</Eyebrow>
      <Title>A horizon in possibility space</Title>
      <Lede>
        “Now” is a boundary where unobserved possibilities become irreversible records —
        an event horizon for information. Behind it lies the immutable past (orange);
        ahead, the shrinking cloud of futures (cyan&nbsp;→&nbsp;violet). Drive the
        parameter <Eq>t</Eq> from Big Bang to heat death and watch the frontier sweep.
      </Lede>

      <Instrument
        label="Entropy boxes · interactive"
        hint="drag the t slider · orbit the scene"
        tall
      >
        <LazyEmbed minHeight="72vh">
          <EntropyVisualization t={t} setT={setT} />
        </LazyEmbed>
      </Instrument>

      <Body>
        Future particles never decrease in number — as informational entropy collapses
        they only grow more excited, pumping thermodynamic entropy toward heat death.
        High-probability branches are cheapest to commit (Landauer:
        <Eq>E = k<sub>B</sub>T ln(1/p)</Eq>), so the horizon resolves them first.
      </Body>
    </Scene>
  );
}

/* =========================================================
   3 — Time dilation
   ========================================================= */
function Dilation() {
  return (
    <Scene id="dilation" tone="past">
      <Eyebrow num="03">Relativity as observation economics</Eyebrow>
      <Title>Clocks slow where observation is expensive</Title>
      <Lede>
        Each irreversible bit costs <Eq>k<sub>B</sub>T ln 2</Eq>. Deeper in a gravity
        well the local temperature rises (Tolman–Ehrenfest), so every commitment costs
        more and the now-horizon advances slower. The arithmetic returns exactly the
        Schwarzschild factor — <Eq>dτ/dt = √g₀₀</Eq> — not as geometry, but as
        thermodynamics.
      </Lede>

      <Instrument label="Gravitational time dilation">
        <div className="svg-stage">
          <DilationDiagram />
        </div>
      </Instrument>

      <Stats
        items={[
          { value: '√g₀₀', label: 'gravitational factor recovered' },
          { value: '1/γ', label: 'velocity factor from horizon contraction' },
          { value: 'E = mc²', label: 'mass-energy as the Landauer bill' },
        ]}
      />
      <Body>
        For a moving observer the causal horizon contracts, fewer possibilities are
        reachable, and capacity falls by the Lorentz factor — recovering special-
        relativistic dilation from the same ledger.
      </Body>
    </Scene>
  );
}

/* =========================================================
   4 — Mass & gravity (interactive branching)
   ========================================================= */
function MassGravity({ t, setT }) {
  return (
    <Scene id="gravity" tone="future" wide>
      <Eyebrow num="04">Gravity as statistical bias</Eyebrow>
      <Title>Mass is informational complexity; gravity is its gradient</Title>
      <Lede>
        A region dense with entangled, unresolved possibilities is expensive to observe —
        it resists the now-horizon exactly as if it had mass. Branches that lead toward
        such regions are simply the cheapest to collapse, so they resolve first. The bulk
        flow follows the path of <strong>maximum entropy production</strong>. That path is
        gravity.
      </Lede>

      <Instrument
        label="Branching collapse · interactive"
        hint="watch probability-weighted branches prune"
        tall
      >
        <LazyEmbed minHeight="64vh">
          <BranchingSimulation />
        </LazyEmbed>
      </Instrument>

      <Pull>
        The universe does not choose the gravitational trajectory. The gravitational
        trajectory is simply the cheapest branch to collapse, so it is resolved first.
      </Pull>

      <Instrument label="Causal horizons & possibility pruning" hint="shared timeline t">
        <LazyEmbed minHeight="56vh">
          <CausalHorizonVisualization t={t} setT={setT} />
        </LazyEmbed>
      </Instrument>
    </Scene>
  );
}

/* =========================================================
   5 — Dark matter
   ========================================================= */
function DarkMatter() {
  return (
    <Scene id="dark-matter" tone="future">
      <Eyebrow num="05">Halos without particles</Eyebrow>
      <Title>Dark matter is informational complexity without baryons</Title>
      <Lede>
        Convolve a galaxy's baryonic profile with the QFT correlation kernel
        <Eq>C(d) ∝ 1/d<sup>n</sup></Eq> and the resulting informational-complexity
        density traces the Navarro–Frenk–White halo with <strong>R² ≈ 0.99</strong>. No
        new particle — just the gravitational shadow of a region's unresolved possibility
        structure.
      </Lede>

      <Instrument label="Hernquist → NFW · kernel convolution">
        <div className="svg-stage">
          <NfwChart />
        </div>
      </Instrument>

      <Body>
        Because the complexity profile falls off far more slowly than the baryons, the
        enclosed effective mass keeps growing with radius — keeping circular velocity
        flat. The same picture explains why direct-detection experiments keep finding
        nothing: there is no particle to detect.
      </Body>
    </Scene>
  );
}

/* =========================================================
   6 — Empirical tests (SPARC + KiDS panels)
   ========================================================= */
function Empirical() {
  return (
    <Scene id="tests" tone="past" wide>
      <Eyebrow num="06">Confrontation with data</Eyebrow>
      <Title>One coupling, derived — then tested across four datasets</Title>
      <Lede>
        The steady-state feedback loop fixes the coupling's mass scaling before any fit:
        <Eq>α ∝ M<sup>−0.491</sup></Eq>. Across 171 SPARC galaxies the measured value is
        <Eq>M<sup>−0.594 ± 0.052</sup></Eq> — agreement to <strong>2.0σ</strong>. Against
        KiDS-1000 weak lensing, two global parameters beat NFW's eight in every stellar-
        mass bin.
      </Lede>

      <Stats
        items={[
          { value: '2.0σ', label: 'predicted vs measured α–M slope (SPARC)' },
          { value: '5.65 vs 8.93', label: 'reduced χ² — Info vs NFW (KiDS)' },
          { value: '2 vs 8', label: 'global parameters used' },
        ]}
      />

      <Instrument label="SPARC · the α–M scaling relation">
        <LazyEmbed minHeight="62vh">
          <SPARCResults />
        </LazyEmbed>
      </Instrument>

      <Instrument label="KiDS-1000 · weak-lensing two-zone fit">
        <LazyEmbed minHeight="62vh">
          <KiDSResults />
        </LazyEmbed>
      </Instrument>

      <Body>
        The kernel runs with scale in 12 of 12 bin–split combinations. Its bare outer
        value is measured jointly at <Eq>n = 2.05 ± 0.04</Eq>, placing the parameter-free
        free-scalar-field prediction <Eq>n = 2</Eq> at just 1.3σ. Fixing the outer kernel
        there improves the global lensing fit by <strong>Δχ² = −156</strong> at equal
        parameter count.
      </Body>
    </Scene>
  );
}

/* =========================================================
   7 — Bullet Cluster
   ========================================================= */
function Bullet() {
  return (
    <Scene id="bullet" tone="past">
      <Eyebrow num="07">The honest stress test</Eyebrow>
      <Title>The Bullet Cluster: a conditional success</Title>
      <Lede>
        The naive framework fails — convolving total baryons puts the peak on the gas,
        not the galaxies. The fix is the <strong>coherence fraction η</strong>: shocked,
        sink-coupled gas writes irreversible records (η small) while collisionless stars
        do not (η ≈ 1). Weighting by η moves the predicted peak onto the galaxies, within
        ~13 kpc of the lensing peak.
      </Lede>

      <Instrument label="Gas–lensing offset">
        <div className="svg-stage">
          <BulletDiagram />
        </div>
      </Instrument>

      <Pull>
        The Bullet Cluster result is fittable within the framework, not predicted by it —
        the required η<sub>gas</sub> ≈ 0.1 is phenomenological, and the most literal
        Landauer accounting gives η ≈ 0.9999. We state this plainly.
      </Pull>
    </Scene>
  );
}

/* =========================================================
   8 — The ledger: fit vs derived vs chosen
   ========================================================= */
const LEDGER = [
  { q: 'Kernel form C(d) = 1/dⁿ', status: 'theoretical', how: 'QFT mutual-information decay I ∼ 1/d²ᐟ.' },
  { q: 'Bare scaling dimension Δ', status: 'predicted', how: 'Free-scalar value Δ=1 (n=2); measured n=2.05±0.04, 1.3σ.' },
  { q: 'Dressing depth nₑ𝒻𝒻', status: 'fit', how: 'n≈1.35 in dense regions (two-zone KiDS, Δχ²=−156).' },
  { q: 'α per galaxy', status: 'derived', how: 'Steady state α∝M⁻⁰·⁴⁹¹; SPARC M⁻⁰·⁵⁹⁴, 2.0σ.' },
  { q: 'Normalisation α₀', status: 'fit', how: 'Calibrated once to KiDS-1000 lensing.' },
  { q: 'Coherence fraction η', status: 'mixed', how: 'Limits derived (η=1 exact); intermediate values phenomenological.' },
];
function Ledger() {
  return (
    <Scene id="ledger" tone="now">
      <Eyebrow num="08">Radical transparency</Eyebrow>
      <Title>What is derived, what is fit, what is chosen</Title>
      <Lede>
        A framework earns trust by saying exactly where each number comes from. One
        quantity is a genuine prediction-then-test; one is a parameter-free theoretical
        value confirmed after the fact; the rest are honestly labelled.
      </Lede>

      <Reveal className="ledger" delay={0.1}>
        {LEDGER.map((row, i) => (
          <div className={`ledger__row ledger__row--${row.status}`} key={i}>
            <div className="ledger__q">{row.q}</div>
            <div className="ledger__status">{row.status}</div>
            <div className="ledger__how">{row.how}</div>
          </div>
        ))}
      </Reveal>
    </Scene>
  );
}

/* =========================================================
   9 — Conceptual extensions (CPU embed)
   ========================================================= */
function Extensions({ t, setT }) {
  const cards = [
    { h: 'The speed of light', b: 'c is the maximum rate at which possibility can be converted into record. Massless fields carry no internal complexity, so they propagate at the limit; massive ones never can.' },
    { h: 'Quantum mechanics', b: 'Unitary evolution reshapes the probability landscape; collapse is the now-horizon committing it. Superposition persists when no dissipation channel can pay the Landauer cost.' },
    { h: 'Heat death', b: 'As dissipation goes to zero, observation capacity does too. Heat death is not just thermal uniformity — it is the cessation of time itself.' },
  ];
  return (
    <Scene id="extensions" tone="future" wide>
      <Eyebrow num="09">Speculative, and marked as such</Eyebrow>
      <Title>If the core generalises…</Title>
      <Lede>
        These extensions are conceptually motivated by the empirical core but not yet
        quantitatively tested. The framework even has a natural computational reading —
        observation as an irreversible state-commit on a branching execution frontier.
      </Lede>

      <Reveal className="card-grid" delay={0.1}>
        {cards.map((c) => (
          <div className="idea-card" key={c.h}>
            <h3>{c.h}</h3>
            <p>{c.b}</p>
          </div>
        ))}
      </Reveal>

      <Instrument label="Computational interpretation · the execution frontier" hint="shared timeline t">
        <LazyEmbed minHeight="58vh">
          <CPUVisualization t={t} setT={setT} />
        </LazyEmbed>
      </Instrument>
    </Scene>
  );
}

export function Narrative({ t, setT }) {
  return (
    <>
      <Premise />
      <NowHorizon t={t} setT={setT} />
      <Dilation />
      <MassGravity t={t} setT={setT} />
      <DarkMatter />
      <Empirical />
      <Bullet />
      <Ledger />
      <Extensions t={t} setT={setT} />
    </>
  );
}
