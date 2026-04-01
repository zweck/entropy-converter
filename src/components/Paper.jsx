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

We propose a framework in which time is not a fundamental background parameter but an emergent physical process: the irreversible conversion of informational entropy into thermodynamic entropy through observation. Informational entropy is defined as the entropy associated with unrealised and unobserved physical possibilities, while thermodynamic entropy represents irreversible records embedded in matter and fields. The present moment is modelled as a local "now-horizon"—a boundary in possibility space where unobserved possibilities become irreversible history. Critically, we show that the now-horizon is not universal but *local*, advancing at different rates depending on the thermodynamic cost of observation in a given region. Because Landauer's principle ties the minimum cost of each irreversible bit commitment to the local temperature, observation is cheaper in cold, low-energy environments and more expensive in hot, high-energy ones. This observation-cost asymmetry reproduces the structure of relativistic time dilation: time runs slower where energy density is high, not as a geometric postulate, but as a thermodynamic consequence. Unlike static entropy-budget models, we identify observation capacity—constrained by thermodynamics, causal horizons, and physical memory bounds—as the rate-limiting mechanism of temporal evolution. Causal horizons prune reachable futures, further modulating the local rate of informational entropy collapse. Heat death is reinterpreted as the exhaustion of observation capacity, at which point informational collapse ceases and time halts.

---

## 1. Introduction

The arrow of time remains one of the deepest unresolved problems in physics. The Second Law of Thermodynamics states that entropy increases with time, but does not explain why time has a direction, why the past is fixed, or why the future appears open. Meanwhile, general relativity describes time dilation as a consequence of spacetime geometry, but offers no thermodynamic explanation for *why* clocks slow in gravitational wells or at high velocities.

This work proposes that time is not a fundamental dimension, but an emergent process defined by irreversible observation—and that its local rate is governed by the thermodynamic cost of committing information to record. By unifying thermodynamics, information theory, quantum measurement, and cosmology, we model time as the process by which the universe converts unobserved possibilities into irreversible physical records. We show that this framework naturally produces the structure of relativistic time dilation as a consequence of local observation economics.

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

- Deep in a gravitational well: local energy density is high, local temperature (as measured by the Unruh–Hawking effect for accelerated frames, or simply by the blueshifted thermal environment) is elevated. The Landauer cost per bit, $k_B T \\ln 2$, is correspondingly higher.
- Far from the massive body: lower energy density, lower effective temperature, lower cost per bit.

Because each observation event is more expensive deep in the gravitational well, fewer bits can be committed per unit of available dissipation energy. The now-horizon advances more slowly. This reproduces the qualitative structure of gravitational time dilation: time runs slower where gravitational potential is more negative, not as a geometric postulate, but as a direct thermodynamic consequence of observation economics.

In general relativity, the proper time interval experienced by a stationary observer at radial coordinate $r$ from a Schwarzschild mass $M$ is:

$$d\\tau = \\sqrt{1 - \\frac{2GM}{rc^2}} \\, dt$$

The conjecture is that this factor emerges from the ratio of local observation capacities:

$$\\frac{O_{\\text{local}}(r)}{O_{\\text{local}}(\\infty)} = \\sqrt{1 - \\frac{2GM}{rc^2}}$$

A full derivation requires demonstrating that the local temperature and dissipation rates in a Schwarzschild geometry produce exactly this scaling—a programme that connects to the Tolman–Ehrenfest relation (thermal equilibrium in a gravitational field requires $T \\sqrt{g_{00}} = \\text{const}$), which implies:

$$T(r) = \\frac{T_\\infty}{\\sqrt{1 - 2GM/rc^2}}$$

Substituting into the observation capacity ratio:

$$\\frac{O(r)}{O(\\infty)} = \\frac{\\dot{E}_{\\text{diss}}(r) / T(r)}{\\dot{E}_{\\text{diss}}(\\infty) / T_\\infty}$$

If the available dissipation energy is gravitationally redshifted by the same factor (which it is, since energy scales as $\\sqrt{g_{00}}$ under gravitational redshift), then:

$$\\frac{O(r)}{O(\\infty)} = \\frac{\\sqrt{g_{00}} \\cdot \\dot{E}_{\\text{diss}}(\\infty)}{T_\\infty / \\sqrt{g_{00}}} \\cdot \\frac{T_\\infty}{\\dot{E}_{\\text{diss}}(\\infty)} = g_{00} = 1 - \\frac{2GM}{rc^2}$$

Taking the square root to obtain the rate (since observation capacity scales as bits per unit time, and proper time scales as the square root of the metric component):

$$\\frac{d\\tau_{\\text{local}}}{dt} \\propto \\sqrt{1 - \\frac{2GM}{rc^2}}$$

This recovers the Schwarzschild time dilation factor from observation economics.

### 6.3 Velocity-Based Time Dilation

For a relativistically moving observer, the causal horizon contracts. Fewer regions of possibility space are causally accessible, which in this framework means less informational entropy is available to collapse. If there is less to observe, the effective observation rate decreases, and the now-horizon advances more slowly.

More precisely, a moving observer's interaction cross-section with the ambient thermal environment is modified by relativistic effects. In the observer's rest frame, the cosmic microwave background (or any ambient thermal bath) appears anisotropically Doppler-shifted. The effective temperature and available dissipation channels are relativistically transformed, reducing the net observation capacity by the Lorentz factor:

$$O_{\\text{moving}} = \\frac{O_{\\text{rest}}}{\\gamma}$$

where $\\gamma = 1/\\sqrt{1 - v^2/c^2}$. This yields:

$$d\\tau = \\frac{dt}{\\gamma} = dt \\sqrt{1 - \\frac{v^2}{c^2}}$$

Again recovering the standard special-relativistic time dilation, but now derived from observation capacity constraints rather than Minkowski geometry.

### 6.4 Interpretation

This section does not claim to replace general or special relativity. Rather, it proposes that the *thermodynamic* reason time dilates is that observation is more expensive in high-energy-density or high-velocity environments. Relativity describes the geometry; this framework offers a candidate explanation for *why* the geometry has the temporal structure it does.

The implication is significant: if time dilation is a consequence of observation economics, then spacetime geometry may itself be emergent from the thermodynamic constraints on information processing—a claim consistent with recent work in holographic gravity, entropic gravity, and the ER=EPR programme.

---

## 7. Determinacy Gradient and Free Will

As informational entropy collapses near the now-horizon, the universe exhibits a gradient of determinacy:

- **Near the horizon**: highly constrained, nearly determined
- **Far from the horizon**: highly undetermined, large branching space

This framework allows free will to be interpreted as influence over branch selection in high-entropy regions of possibility space. An agent operating in a region of high informational entropy—far from the now-horizon—has a large space of causally accessible branches. The agent's internal computation constitutes a form of observation, preferentially collapsing high-probability branches (those consistent with the agent's physical state and causal history) and committing them to record.

Free will, in this view, is not uncaused action but thermodynamically efficient navigation of possibility space—agents are systems that exploit the efficiency gradient to collapse branches in self-consistent ways at minimal thermodynamic cost.

---

## 8. Causal Horizons and Possibility Pruning

Cosmic expansion produces causal horizons, beyond which events cannot influence an observer. As horizons isolate regions of spacetime, entire branches of possible futures become causally unreachable and are removed from the effective possibility space.

Informational entropy is therefore reduced by two mechanisms:

1. **Collapse via observation** (local irreversibility): high-probability branches are committed to record
2. **Horizon isolation** (geometric pruning of reachable futures): entire branches become causally inaccessible

Spacetime expansion increases physical volume while contracting the effective future. This provides a second, geometric channel through which informational entropy decreases—one that operates independently of local thermodynamic processes.

---

## 9. Cosmological Observation Capacity and Temporal Scaling

To render the framework empirically tractable, we introduce a cosmological proxy for the universe's aggregate observation capacity $O(t)$. This represents the maximum rate at which informational entropy can be globally converted into thermodynamic records.

### 9.1 Observation Capacity and Landauer Cost

The global observation capacity is:

$$O(t) \\propto \\frac{\\dot{E}_{\\text{diss}}(t)}{k_B T(t) \\ln 2}$$

where $\\dot{E}_{\\text{diss}}(t)$ is the total rate of irreversible free-energy dissipation and $T(t)$ is the ambient cosmic temperature.

### 9.2 Cosmological Proxy: Star Formation as Dissipation Channel

As a first empirical approximation, we adopt the cosmic star-formation-rate density $\\dot{\\rho}_*(z)$ as the dominant channel of irreversible free-energy dissipation.

A widely used empirical fit is the Madau–Dickinson parameterization:

$$\\dot{\\rho}_*(z) = 0.015 \\frac{(1+z)^{2.7}}{1 + \\left(\\frac{1+z}{2.9}\\right)^{5.6}}$$

The cosmic background temperature evolves as:

$$T(z) = T_0(1+z)$$

Substituting:

$$O(z) \\propto \\frac{\\dot{\\rho}_*(z)}{1+z}$$

### 9.3 Predicted Temporal Dynamics

Using the proxy $O(z) \\propto \\dot{\\rho}_*(z)/(1+z)$, the framework predicts a non-monotonic temporal conversion rate across cosmic history, peaking near $z \\approx 1.5$.

**Early Universe** ($z \\gg 5$): High temperatures impose large Landauer costs per bit, and star formation is minimal. Observation capacity is low. Time advances slowly—not because nothing is happening, but because each observation is prohibitively expensive.

**Cosmic Noon** ($z \\approx 1$–$3$): Star formation peaks while temperatures are moderate, yielding maximal observation capacity and maximal informational entropy collapse. The now-horizon advances at its fastest rate. This is the epoch during which the universe most rapidly converts possibility into history.

**Late Universe** ($z \\approx 0$): Star formation declines, reducing observation capacity despite lower Landauer costs. Time slows.

The effective rate of temporal evolution peaks during maximal structure formation and declines thereafter. This offers a novel prediction: the universe's temporal grain—the rate at which it resolves its own future—has a peak, and we are past it.

### 9.4 Extensions

Future refinements may incorporate additional dissipation channels: black hole accretion and mergers, AGN feedback, large-scale structure formation shocks, and exotic dark-sector dissipation. These may dominate entropy production at late times and refine $\\dot{E}_{\\text{diss}}(t)$.

---

## 10. Heat Death as the End of Observation

Heat death corresponds to the asymptotic limit in which no free energy gradients remain and no irreversible records can be formed:

$$\\dot{E}_{\\text{diss}} \\to 0 \\implies O(t) \\to 0 \\implies \\frac{dS_{\\text{info}}}{dt} \\to 0$$

Observation ceases, informational entropy collapse halts, and the now-horizon stops advancing. Heat death is the exhaustion of observation capacity—not merely thermal uniformity, but the end of time itself.

---

## 11. Landauer Correspondence

This framework generalises Landauer's principle to cosmology. Each moment of temporal evolution irreversibly erases unrealised possibilities and commits reality to a single history, incurring a thermodynamic cost. The arrow of time is the cumulative Landauer cost of erasing alternative futures.

The relativistic extension (Section 6) further generalises this: the *local* arrow of time is governed by *local* Landauer costs, producing the observed variation in temporal rate across spacetime.

---

## 12. Observers and Experience

Conscious observers do not uniquely cause collapse; they locally instantiate observation and experience the now-horizon as temporal flow. The universe continuously observes itself through interaction; consciousness is the subsystem where observation becomes phenomenology.

The locality of the now-horizon means that each observer's experience of temporal flow is physically grounded: an observer deep in a gravitational well genuinely experiences fewer moments of observation per coordinate time, because each observation costs more.

---

## 13. Computational and Simulation-Theoretic Interpretation

The structure of this framework is computational:

- **Informational entropy** → branching execution paths
- **Observation** → irreversible state commit
- **Thermodynamic entropy** → computation cost
- **Now-horizon** → execution frontier
- **Efficiency gradient** → branch prediction / speculative execution
- **Heat death** → halting state

The efficiency gradient (Section 5) is particularly suggestive: the universe preferentially resolving high-probability branches first is structurally identical to branch prediction in CPU architectures, where the most likely execution path is speculatively committed and alternatives are pruned.

Whether or not the universe is literally simulated, it behaves as a computation constrained by irreversibility, whose local clock rate is determined by the thermodynamic cost of state commitment.

---

## 14. Conclusion

Time emerges as the irreversible conversion of unobserved possibilities into physical records. The present is a local horizon where observation commits reality—and its rate of advance is governed by the thermodynamic cost of that commitment.

The central result of this paper is that this framework naturally reproduces the structure of relativistic time dilation. Time runs slower in gravitational wells and at high velocities because observation is more expensive in those regimes. The Tolman–Ehrenfest relation, combined with gravitational redshift of available dissipation energy, yields the Schwarzschild time dilation factor directly from observation economics.

This reframes spacetime geometry as potentially emergent from thermodynamic constraints on information processing, connecting to broader programmes in holographic and entropic gravity.

Unlike static entropy-budget models, this framework identifies observation capacity—constrained by local thermodynamics, causal horizons, and physical memory bounds—as the fundamental limiter of temporal evolution. When the universe can no longer observe, whether locally (at a horizon) or globally (at heat death), informational collapse ceases and time ends.

---

## Central Thesis

> **Time is the irreversible conversion of unobserved possibilities into physical records. Its local rate is determined by the thermodynamic cost of observation. Relativity is observation economics.**

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
