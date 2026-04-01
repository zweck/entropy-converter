import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Hash function for paper content
async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// TTS player component
function TTSPlayer({ sections, paperHash }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const audioCacheRef = useRef({});

  const fetchAudio = async (text, sectionIndex) => {
    // Check memory cache first
    if (audioCacheRef.current[sectionIndex]) {
      return audioCacheRef.current[sectionIndex];
    }

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, section: sectionIndex, paperHash }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioCacheRef.current[sectionIndex] = url;
    return url;
  };

  const playSection = async (index) => {
    if (index >= sections.length) {
      setIsPlaying(false);
      setCurrentSection(0);
      return;
    }

    setCurrentSection(index);
    setIsLoading(true);
    setError(null);

    try {
      const audioUrl = await fetchAudio(sections[index].text, index);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (err) {
      setError(err.message);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playSection(currentSection);
    }
  };

  const handleAudioEnded = () => {
    if (isPlaying) {
      playSection(currentSection + 1);
    }
  };

  const handlePrev = () => {
    const prev = Math.max(0, currentSection - 1);
    setCurrentSection(prev);
    if (isPlaying) {
      playSection(prev);
    }
  };

  const handleNext = () => {
    const next = Math.min(sections.length - 1, currentSection + 1);
    setCurrentSection(next);
    if (isPlaying) {
      playSection(next);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(audioCacheRef.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  return (
    <div className="tts-player">
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      <div className="tts-controls">
        <button
          className="tts-btn tts-nav"
          onClick={handlePrev}
          disabled={currentSection === 0}
          title="Previous section"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button
          className="tts-btn tts-play"
          onClick={handlePlay}
          disabled={isLoading}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <svg className="tts-spinner" viewBox="0 0 24 24" width="20" height="20">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.4" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : isPlaying ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button
          className="tts-btn tts-nav"
          onClick={handleNext}
          disabled={currentSection === sections.length - 1}
          title="Next section"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>

      <div className="tts-info">
        <span className="tts-section">{sections[currentSection]?.title || `Section ${currentSection + 1}`}</span>
        <span className="tts-progress">{currentSection + 1} / {sections.length}</span>
      </div>

      {error && <div className="tts-error">{error}</div>}
    </div>
  );
}

// Parse paper content into sections for TTS
function parseSections(content) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = { title: 'Introduction', text: '' };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection.text.trim()) {
        sections.push(currentSection);
      }
      const title = line.replace(/^##\s*/, '').replace(/^\d+\.\s*/, '');
      currentSection = { title, text: '' };
    } else {
      // Strip markdown/latex for TTS
      const cleanLine = line
        .replace(/\$\$[\s\S]*?\$\$/g, '') // Remove display math
        .replace(/\$[^$]+\$/g, '') // Remove inline math
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold to plain
        .replace(/\*([^*]+)\*/g, '$1') // Italic to plain
        .replace(/`[^`]+`/g, '') // Remove code
        .replace(/^#+\s*/, '') // Remove headers
        .replace(/^>\s*/, '') // Remove blockquotes
        .replace(/^-\s*/, '') // Remove list markers
        .replace(/^\d+\.\s*/, '') // Remove numbered lists
        .replace(/---/g, '') // Remove hr
        .trim();

      if (cleanLine) {
        currentSection.text += cleanLine + ' ';
      }
    }
  }

  if (currentSection.text.trim()) {
    sections.push(currentSection);
  }

  return sections;
}

const paperContent = `
# Time as Observation-Limited Entropy Conversion

---

## Abstract

We propose a framework in which time is not a fundamental background parameter but an emergent physical process: the irreversible conversion of informational entropy into thermodynamic entropy through observation. Informational entropy is defined as the entropy associated with unrealised and unobserved physical possibilities, while thermodynamic entropy represents irreversible records embedded in matter and fields. The present moment is modelled as a local "now-horizon"—a boundary in possibility space where unobserved possibilities become irreversible history.

We show that the now-horizon is local, advancing at different rates depending on the thermodynamic cost of observation. Because Landauer's principle ties the minimum cost of each irreversible bit commitment to the local temperature, observation is cheaper in cold, low-energy environments and more expensive in hot, high-energy ones. This observation-cost asymmetry reproduces the structure of relativistic time dilation: time runs slower where energy density is high, not as a geometric postulate, but as a thermodynamic consequence.

We further argue that mass is not a fundamental property of matter but the informational complexity of a region's unresolved possibility space—a measure of observation resistance. Gravity emerges as the spatial gradient of observation cost. This reinterpretation naturally suggests that dark matter is not a particle but the gravitational signature of informationally complex regions of possibility space: areas where dense, entangled branching structures create observation-cost gradients without corresponding baryonic matter.

Heat death is reinterpreted as the exhaustion of observation capacity, at which point informational collapse ceases and time halts.

---

## 1. Introduction

The arrow of time remains one of the deepest unresolved problems in physics. The Second Law of Thermodynamics states that entropy increases with time, but does not explain why time has a direction, why the past is fixed, or why the future appears open. General relativity describes time dilation as a consequence of spacetime geometry, but offers no thermodynamic explanation for why clocks slow in gravitational wells or at high velocities. And dark matter—invoked to explain galactic rotation curves, gravitational lensing, and large-scale structure—has resisted direct detection for decades.

This work proposes that these apparently separate problems share a common origin. Time is not a fundamental dimension but an emergent process defined by irreversible observation. Its local rate is governed by the thermodynamic cost of committing information to record. Mass is the informational complexity that determines that cost. Gravity is the spatial gradient of observation cost. And dark matter is the gravitational signature of informational complexity without baryonic substrate.

---

## 2. Dual Entropy Framework

We distinguish two forms of entropy:

**Informational entropy** $S_{\\text{info}}$: entropy associated with unrealised and unobserved physical possibilities. This characterises the openness of the future—the branching space of outcomes not yet committed to record.

**Thermodynamic entropy** $S_{\\text{therm}}$: entropy associated with irreversible physical records embedded in matter, radiation, and fields. This characterises the fixedness of the past.

The total entropy budget of the universe is partitioned between these two forms. Temporal evolution is the process by which $S_{\\text{info}}$ is converted into $S_{\\text{therm}}$ through irreversible observation.

---

## 3. Observation and Irreversibility

Observation is defined physically, not cognitively. Any irreversible interaction that records information in the environment constitutes an observation. This includes decoherence, scattering, measurement devices, stellar processes, and biological observers.

By Landauer's principle, irreversible recording has a minimum thermodynamic cost:

$$E \\geq k_B T \\ln 2 \\quad \\text{per bit}$$

where $k_B$ is Boltzmann's constant and $T$ is the local temperature. Whenever informational entropy collapses—whenever a possibility is committed to record—thermodynamic entropy must increase by at least this amount. Observation is therefore the mechanism by which informational entropy is converted into thermodynamic entropy, and each act of observation incurs a non-negotiable physical cost.

---

## 4. The Now-Horizon

The present moment ("now") is defined as a horizon in possibility space where unobserved possibilities become irreversible records. This boundary has properties analogous to an event horizon:

- Irreversibility: once crossed, information cannot be uncommitted
- One-way information flow: from open possibility to fixed record
- Entropy generation: each crossing event produces thermodynamic entropy
- Separation of accessible and inaccessible states

The now-horizon separates:

- **Future**: unobserved, high informational entropy
- **Past**: observed, fixed, zero informational entropy

Temporal flow is the propagation of this horizon through possibility space.

---

## 5. Efficiency and the Topology of Collapse

Not all branches of the possibility space cost the same to collapse. The Landauer cost of committing a branch to record is weighted by its probability. In Shannon entropy, high-probability events carry less surprise—less information content—and therefore require less thermodynamic entropy production per observation event.

A high-probability branch represents a shorter route through informational space: it is thermodynamically *efficient* to collapse. Conversely, low-probability branches carry high information content and demand greater energy expenditure to commit.

This means the now-horizon does not advance uniformly across possibility space. It advances fastest along high-probability, low-cost branches—the paths of least thermodynamic resistance—and slowest where the possibility distribution is flat (uniform probability, maximum informational entropy, maximum cost per collapse).

This creates a temporal topology: some regions of possibility space resolve faster than others. The universe preferentially collapses cheap, high-probability branches first. Low-probability branches may persist as unresolved informational entropy—a feature that connects naturally to quantum superposition, where rare outcomes remain "open" precisely because they are costly to commit.

---

## 6. Local Now-Horizons and Relativistic Time Dilation

The central extension of this framework is the recognition that the now-horizon is *local*. Because observation cost depends on local physical conditions, the rate at which informational entropy is converted into thermodynamic records varies across spacetime.

### 6.1 The Core Mechanism

From Landauer's principle, the minimum energy cost to irreversibly commit one bit of information is:

$$E_{\\text{bit}} = k_B T \\ln 2$$

The local observation capacity—the rate at which the now-horizon can advance—is therefore:

$$O_{\\text{local}} \\propto \\frac{\\dot{E}_{\\text{diss}}}{k_B T \\ln 2}$$

where $\\dot{E}_{\\text{diss}}$ is the locally available rate of free-energy dissipation and $T$ is the local temperature. In regions where the Landauer cost per bit is high, fewer bits can be committed per unit of available energy, and the now-horizon advances more slowly.

### 6.2 Gravitational Time Dilation

In a gravitational field, the local temperature and energy density increase with depth in the potential well. Consider an observer near a massive body versus one in flat spacetime:

- Deep in a gravitational well: local energy density is high, local temperature (as measured by the Tolman-Ehrenfest effect) is elevated. The Landauer cost per bit, $k_B T \\ln 2$, is correspondingly higher.
- Far from the massive body: lower energy density, lower effective temperature, lower cost per bit.

Because each observation event is more expensive deep in the gravitational well, fewer bits can be committed per unit of available dissipation energy. The now-horizon advances more slowly. This reproduces the qualitative structure of gravitational time dilation: time runs slower where gravitational potential is more negative, not as a geometric postulate, but as a direct thermodynamic consequence of observation economics.

In general relativity, the proper time interval experienced by a stationary observer at radial coordinate $r$ from a Schwarzschild mass $M$ is:

$$d\\tau = \\sqrt{1 - \\frac{2GM}{rc^2}} \\, dt$$

The Tolman-Ehrenfest relation (thermal equilibrium in a gravitational field requires $T \\sqrt{g_{00}} = \\text{const}$) implies:

$$T(r) = \\frac{T_\\infty}{\\sqrt{1 - 2GM/rc^2}}$$

Substituting into the observation capacity ratio, and noting that available dissipation energy is gravitationally redshifted by $\\sqrt{g_{00}}$:

$$\\frac{O(r)}{O(\\infty)} = \\frac{\\sqrt{g_{00}} \\cdot \\dot{E}_{\\text{diss}}(\\infty)}{T_\\infty / \\sqrt{g_{00}}} \\cdot \\frac{T_\\infty}{\\dot{E}_{\\text{diss}}(\\infty)} = g_{00} = 1 - \\frac{2GM}{rc^2}$$

Taking the square root to obtain the rate:

$$\\frac{d\\tau_{\\text{local}}}{dt} \\propto \\sqrt{1 - \\frac{2GM}{rc^2}}$$

This recovers the Schwarzschild time dilation factor from observation economics.

### 6.3 Velocity-Based Time Dilation

For a relativistically moving observer, the causal horizon contracts. Fewer regions of possibility space are causally accessible, which in this framework means less informational entropy is available to collapse. The observer's interaction cross-section with the ambient thermal environment is modified by relativistic effects, reducing the net observation capacity by the Lorentz factor:

$$O_{\\text{moving}} = \\frac{O_{\\text{rest}}}{\\gamma}$$

where $\\gamma = 1/\\sqrt{1 - v^2/c^2}$. This yields:

$$d\\tau = \\frac{dt}{\\gamma} = dt \\sqrt{1 - \\frac{v^2}{c^2}}$$

Again recovering the standard special-relativistic time dilation from observation capacity constraints.

### 6.4 Interpretation

This section does not claim to replace general or special relativity. Rather, it proposes that the thermodynamic reason time dilates is that observation is more expensive in high-energy-density or high-velocity environments. Relativity describes the geometry; this framework offers a candidate explanation for *why* the geometry has the temporal structure it does.

If time dilation is a consequence of observation economics, then spacetime geometry may itself be emergent from the thermodynamic constraints on information processing—consistent with recent work in holographic gravity, entropic gravity, and the ER=EPR programme.

---

## 7. Mass as Observation Resistance

The relationship between mass and entropy has deep roots in established physics. The Bekenstein bound states that the maximum entropy a region of space can contain is proportional to its mass-energy and its radius:

$$S \\leq \\frac{2\\pi k_B R E}{\\hbar c}$$

The most extreme case—a black hole—saturates this bound, with entropy proportional to its surface area rather than its volume. Mass and entropy are already deeply entangled.

### 7.1 The Dual Role of Mass

In this framework, mass plays a dual role through $E = mc^2$:

**Mass as observation fuel.** Energy is the currency that pays for observation—it funds the Landauer cost of collapsing informational entropy into thermodynamic records. Mass-energy represents the total budget available for irreversible state commitment.

**Mass as observation resistance.** Via the Tolman-Ehrenfest relation, mass raises the local temperature, increasing the Landauer cost per bit. Mass-dense regions have large observation budgets but terrible efficiency per bit committed.

This tension—mass as both fuel and resistance—is not a contradiction but a fundamental feature of the framework. It means that mass-dense regions process information at lower efficiency, producing the characteristic slowing of the now-horizon that manifests as gravitational time dilation.

### 7.2 Mass as Informational Complexity

The deeper claim is that mass may be emergent from informational structure. A region with many entangled, high-information-content, unresolved possibilities is expensive to observe. It resists now-horizon advance. It behaves exactly as if it has mass.

In this interpretation, mass is not a fundamental property of matter but a measure of the informational complexity of a region's unresolved possibility space—its observation resistance density. The more complex and entangled the local branching structure, the greater the effective mass.

### 7.3 Gravity as the Observation Cost Gradient

If mass is observation resistance density, then gravity is the spatial gradient of observation cost. Objects "fall" toward massive bodies because the now-horizon has a topological slope: informational entropy collapses at different rates at different points, and the dynamics of physical systems follow the gradient of that differential.

This is structurally equivalent to Verlinde's entropic gravity, but arrived at from a different direction. Verlinde argued that gravity is an entropic force arising from information displacement on holographic screens. This framework provides a specific mechanism: gravity is the spatial gradient of the Landauer cost of temporal evolution.

### 7.4 The Bekenstein Bound as an Accounting Identity

In this framework, the Bekenstein bound acquires a natural interpretation. If maximum entropy is bounded by mass-energy and spatial extent, and mass-energy is the local observation budget, then the bound simply states that a region cannot contain more unresolved informational entropy than it has energy to eventually collapse. The bound is not a mysterious constraint but an accounting identity: you cannot owe more informational debt than your energy budget can service.

---

## 8. Dark Matter as Informational Complexity

If mass is the informational complexity of a region's unresolved possibility space, then gravitational effects do not require baryonic matter. They require informationally complex regions where the now-horizon is expensive to advance.

### 8.1 The Proposal

Dark matter, in this framework, is not a particle. It is the gravitational signature of regions where the informational possibility structure is dense and entangled—where complex branching structures create observation-cost gradients—without that complexity being expressed as visible baryonic matter.

The gravitational lensing, rotation curves, and cluster dynamics attributed to dark matter would be the geometric signature of informational complexity rather than hidden mass.

### 8.2 Why Dark Matter Does Not Interact Electromagnetically

This reinterpretation addresses the two deepest puzzles of dark matter simultaneously:

**Why it gravitates but does not interact electromagnetically.** It is not material substance; it is informational structure. There is no particle to scatter photons. Electromagnetic interaction requires physical degrees of freedom coupled to the photon field. Informational complexity in possibility space has no such coupling—it affects the observation-cost landscape (and thus the metric) without participating in gauge interactions.

**Why direct detection experiments consistently fail.** There is no particle to detect. The gravitational effects are real, but their source is the structure of the informational possibility space, not a population of weakly interacting massive particles.

### 8.3 Distribution: Dark Matter Halos

Dark matter halos concentrate around galaxies and large-scale structure—exactly where this framework predicts the highest informational complexity. Galaxies are regions of intense causal entanglement: billions of stars, feedback loops, magnetic fields, and gravitational interactions create a dense web of correlated possibilities.

The halo would represent the informational shadow of this complexity, extending beyond the visible matter. The radial profile of informational complexity around a galaxy—determined by the density and entanglement structure of causal correlations—should reproduce the observed NFW halo profile:

$$\\rho(r) = \\frac{\\rho_0}{\\frac{r}{R_s}\\left(1 + \\frac{r}{R_s}\\right)^2}$$

This constitutes a testable prediction: the informational complexity profile of a galaxy's possibility space must match the NFW form. Computing this profile from first principles—requiring a model of how causal correlations distribute around baryonic structure—is an open problem that would constitute a strong test of the framework.

### 8.4 The Bullet Cluster

The Bullet Cluster is often cited as the strongest evidence for particle dark matter, because the gravitational lensing signal separated from the hot gas during the collision of two galaxy clusters. In this framework, the separation has a natural explanation:

The gas collision is a massive observation event: enormous amounts of informational entropy are rapidly collapsed as the gas shocks, heats, and radiates. This reduces the local informational complexity of the gas region—possibilities are being resolved at an enormous rate.

However, the informational structure associated with the galaxies' long-range gravitational entanglement passes through relatively intact. The deep causal correlations between stellar systems, dark matter-associated informational structures, and large-scale gravitational relationships are not disrupted by the gas interaction. They preserve their observation-cost gradient.

The lensing map separates from the gas because information processing (the gas shock) and informational structure (the entangled possibility space) are different things. The former destroys local complexity; the latter persists through the collision.

### 8.5 Dark Energy Connection

If dark matter is informational complexity, dark energy may represent the base-rate growth of the possibility space itself. Cosmic expansion increases the volume of space, creating new causal relationships and new branching structures. The accelerating expansion would correspond to an accelerating growth of the informational possibility space—a cosmological "interest rate" on informational entropy that outpaces the universe's capacity to collapse it.

This is speculative, but it connects the two great unknowns of cosmology through a single informational mechanism: dark matter is the spatial structure of informational complexity, and dark energy is its temporal growth rate.

---

## 9. The Decomposition of Spacetime

If time is an emergent process (the conversion of informational entropy into thermodynamic records) and mass-gravity is an emergent property (the observation-cost landscape of informational complexity), then "spacetime" as a unified geometric object is an effective description—not fundamental.

Space is the arena of informational relationships between possible observations. Time is what happens when those relationships are irreversibly resolved. The metric tensor is not fundamental; it is a convenient encoding of how observation costs vary across the informational landscape.

This implies a preferred structure that general relativity explicitly denies. In GR, there is no preferred way to slice spacetime into "space at a moment"—that is diffeomorphism invariance. But this framework does have a preferred structure: the now-horizon. It is a physically real boundary defined by thermodynamic irreversibility, not an arbitrary coordinate choice.

The spatial metric may also emerge from informational structure: two events are "far apart" because collapsing the informational entropy between them requires many intermediate observation steps. Spatial distance is informational distance. The full metric—temporal and spatial components—emerges from the cost structure of observation in possibility space.

---

## 10. Determinacy Gradient and Free Will

As informational entropy collapses near the now-horizon, the universe exhibits a gradient of determinacy:

- **Near the horizon**: highly constrained, nearly determined
- **Far from the horizon**: highly undetermined, large branching space

Free will, in this view, is not uncaused action but thermodynamically efficient navigation of possibility space. Agents are systems that exploit the efficiency gradient (Section 5) to collapse branches in self-consistent ways at minimal thermodynamic cost—preferentially resolving high-probability branches that align with their causal history and physical state.

---

## 11. Causal Horizons and Possibility Pruning

Cosmic expansion produces causal horizons, beyond which events cannot influence an observer. As horizons isolate regions of spacetime, entire branches of possible futures become causally unreachable and are removed from the effective possibility space.

Informational entropy is therefore reduced by two mechanisms:

1. **Collapse via observation** (local irreversibility): high-probability branches are committed to record
2. **Horizon isolation** (geometric pruning of reachable futures): entire branches become causally inaccessible

Spacetime expansion increases physical volume while contracting the effective future.

---

## 12. Cosmological Observation Capacity and Temporal Scaling

### 12.1 Observation Capacity and Landauer Cost

The global observation capacity is:

$$O(t) \\propto \\frac{\\dot{E}_{\\text{diss}}(t)}{k_B T(t) \\ln 2}$$

### 12.2 Cosmological Proxy: Star Formation as Dissipation Channel

As a first empirical approximation, we adopt the cosmic star-formation-rate density $\\dot{\\rho}_*(z)$ as the dominant channel of irreversible free-energy dissipation, using the Madau-Dickinson parameterization:

$$\\dot{\\rho}_*(z) = 0.015 \\frac{(1+z)^{2.7}}{1 + \\left(\\frac{1+z}{2.9}\\right)^{5.6}}$$

With $T(z) = T_0(1+z)$:

$$O(z) \\propto \\frac{\\dot{\\rho}_*(z)}{1+z}$$

### 12.3 Predicted Temporal Dynamics

The framework predicts a non-monotonic temporal conversion rate peaking near $z \\approx 1.5$:

**Early Universe** ($z \\gg 5$): High temperatures impose large Landauer costs per bit. Observation capacity is low. Time advances slowly because each observation is prohibitively expensive.

**Cosmic Noon** ($z \\approx 1$–$3$): Star formation peaks while temperatures are moderate, yielding maximal observation capacity. The now-horizon advances at its fastest rate.

**Late Universe** ($z \\approx 0$): Star formation declines, reducing observation capacity despite lower Landauer costs.

The universe's temporal grain—the rate at which it resolves its own future—has a peak, and we are past it.

### 12.4 Extensions

Future refinements may incorporate additional dissipation channels: black hole accretion and mergers, AGN feedback, large-scale structure formation shocks, and exotic dark-sector dissipation.

---

## 13. Heat Death as the End of Observation

Heat death corresponds to the asymptotic limit in which no free energy gradients remain:

$$\\dot{E}_{\\text{diss}} \\to 0 \\implies O(t) \\to 0 \\implies \\frac{dS_{\\text{info}}}{dt} \\to 0$$

Observation ceases, informational entropy collapse halts, and the now-horizon stops advancing. Heat death is the exhaustion of observation capacity—not merely thermal uniformity, but the end of time itself.

---

## 14. Landauer Correspondence

This framework generalises Landauer's principle to cosmology. Each moment of temporal evolution irreversibly erases unrealised possibilities and commits reality to a single history, incurring a thermodynamic cost. The arrow of time is the cumulative Landauer cost of erasing alternative futures.

The relativistic extension (Section 6) further generalises this: the *local* arrow of time is governed by *local* Landauer costs, producing the observed variation in temporal rate across spacetime. The mass-gravity extension (Section 7) completes the picture: the spatial structure of observation costs produces both inertial mass and gravitational dynamics.

---

## 15. Observers and Experience

Conscious observers do not uniquely cause collapse; they locally instantiate observation and experience the now-horizon as temporal flow. The universe continuously observes itself through interaction; consciousness is the subsystem where observation becomes phenomenology.

The locality of the now-horizon means that each observer's experience of temporal flow is physically grounded: an observer deep in a gravitational well genuinely experiences fewer moments of observation per coordinate time, because each observation costs more.

---

## 16. Computational and Simulation-Theoretic Interpretation

The structure of this framework is computational:

- **Informational entropy** → branching execution paths
- **Observation** → irreversible state commit
- **Thermodynamic entropy** → computation cost
- **Now-horizon** → execution frontier
- **Efficiency gradient** → branch prediction / speculative execution
- **Mass** → memory density / computational complexity per region
- **Gravity** → load balancing gradient (computation migrates toward cheaper regions)
- **Dark matter** → allocated but unrendered computational structure
- **Heat death** → halting state

The efficiency gradient is particularly suggestive: the universe preferentially resolving high-probability branches first is structurally identical to branch prediction in CPU architectures, where the most likely execution path is speculatively committed and alternatives are pruned.

The dark matter interpretation adds a new computational analogy: dark matter is computational structure that has been allocated in the possibility space—contributing to the system's resource accounting and load distribution—without being rendered as visible output. It affects the execution environment without appearing in the display buffer.

Whether or not the universe is literally simulated, it behaves as a computation constrained by irreversibility, whose local clock rate is determined by the thermodynamic cost of state commitment.

---

## 17. Summary of Empirical Predictions

The framework generates several testable predictions and retrodictions:

1. **Gravitational time dilation** emerges from the Tolman-Ehrenfest relation applied to observation capacity (Section 6.2).

2. **Velocity time dilation** emerges from Lorentz contraction of causal horizons reducing available informational entropy (Section 6.3).

3. **Non-monotonic cosmic temporal rate** peaking at $z \\approx 1.5$, tracking the observation capacity proxy $O(z) \\propto \\dot{\\rho}_*(z)/(1+z)$ (Section 12.3).

4. **Dark matter halo profiles** should be derivable from the informational complexity profile of causal correlations around baryonic structure (Section 8.3).

5. **Bullet Cluster separation** follows from the distinction between information processing (gas shock) and informational structure (entangled possibility space) (Section 8.4).

6. **Bekenstein bound** is an accounting identity: maximum informational entropy equals the observation budget of a region (Section 7.4).

7. **Direct dark matter detection** will continue to fail if dark matter is informational structure rather than particles (Section 8.2).

---

## 18. Conclusion

Time emerges as the irreversible conversion of unobserved possibilities into physical records. The present is a local horizon where observation commits reality—and its rate of advance is governed by the thermodynamic cost of that commitment.

Mass is the informational complexity that determines observation cost. Gravity is the spatial gradient of that cost. Dark matter is the gravitational signature of informationally complex regions of possibility space that lack baryonic substrate. Spacetime geometry is an effective encoding of the observation-cost landscape.

This framework unifies the arrow of time, relativistic time dilation, the nature of mass, the origin of gravity, and the dark matter problem through a single mechanism: the thermodynamic cost of irreversible information commitment, governed by Landauer's principle.

---

## Central Thesis

> **Time is the irreversible conversion of unobserved possibilities into physical records. Its local rate is determined by the thermodynamic cost of observation. Mass is observation resistance. Gravity is the gradient of that resistance. Dark matter is observation resistance without matter. Relativity is observation economics.**

`;

// Pre-compute sections (static)
const sections = parseSections(paperContent);

export default function Paper() {
  const [paperHash, setPaperHash] = useState(null);

  useEffect(() => {
    hashContent(paperContent).then(setPaperHash);
  }, []);

  return (
    <div className="paper-container">
      {paperHash && <TTSPlayer sections={sections} paperHash={paperHash} />}
      <article className="paper-content">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {paperContent}
        </ReactMarkdown>
      </article>
    </div>
  );
}
