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

We propose a framework in which time is not a fundamental background parameter but an emergent physical process: the irreversible conversion of informational entropy into thermodynamic entropy through observation. Informational entropy is defined as the entropy associated with unrealised and unobserved physical possibilities, while thermodynamic entropy represents irreversible records embedded in matter and fields. The present moment is modelled as a "now-horizon," a boundary in possibility space where unobserved possibilities become irreversible history. Unlike static entropy-budget models, we identify observation capacity—constrained by thermodynamics, causal horizons, and physical memory bounds—as the rate-limiting mechanism of temporal evolution. Causal horizons prune reachable futures, accelerating informational entropy loss. Heat death is reinterpreted as the exhaustion of observation capacity, at which point informational collapse ceases and time halts.

---

## 1. Introduction

The arrow of time remains one of the deepest unresolved problems in physics. The Second Law of Thermodynamics states that entropy increases with time, but does not explain why time has a direction, why the past is fixed, or why the future appears open.

This work proposes that time is not a fundamental dimension, but an emergent process defined by irreversible observation. By unifying thermodynamics, information theory, quantum measurement, and cosmology, we model time as the process by which the universe converts unobserved possibilities into irreversible physical records.

---

## 2. Dual Entropy Framework

We distinguish two forms of entropy:

- **Informational entropy** $S_{\\text{info}}$: entropy associated with unrealised and unobserved physical possibilities.

- **Thermodynamic entropy** $S_{\\text{therm}}$: entropy associated with irreversible physical records embedded in matter, radiation, and fields.

Informational entropy characterizes the openness of the future; thermodynamic entropy characterizes the fixedness of the past.

---

## 3. Observation and Irreversibility

Observation is defined physically, not cognitively. Any irreversible interaction that records information in the environment constitutes an observation. This includes decoherence, scattering, measurement devices, stellar processes, and biological observers.

By Landauer's principle, irreversible recording has a minimum thermodynamic cost:

$$E \\geq k_B T \\ln 2 \\quad \\text{per bit}$$

Thus, whenever informational entropy collapses, thermodynamic entropy must increase. Observation is therefore the mechanism by which informational entropy is converted into thermodynamic entropy.

---

## 4. The Now-Horizon

The present moment ("now") is defined as a horizon in possibility space where unobserved possibilities become irreversible records. This boundary has properties analogous to an event horizon:

- Irreversibility
- One-way information flow
- Entropy generation
- Separation of accessible and inaccessible states

The now-horizon separates:

- **Future**: unobserved, high informational entropy
- **Past**: observed, fixed, zero informational entropy

Temporal flow is the propagation of this horizon through possibility space.

---

## 5. Determinacy Gradient and Free Will

As informational entropy collapses near the now-horizon, the universe exhibits a gradient of determinacy:

- **Near the horizon**: highly constrained, nearly determined
- **Far from the horizon**: highly undetermined, large branching space

This framework allows free will to be interpreted as influence over branch selection in high-entropy regions of possibility space.

---

## 6. Causal Horizons and Possibility Pruning

Cosmic expansion produces causal horizons, beyond which events cannot influence an observer. As horizons isolate regions of spacetime, entire branches of possible futures become causally unreachable and are removed from the effective possibility space.

Informational entropy is therefore reduced by two mechanisms:

1. **Collapse via observation** (local irreversibility)
2. **Horizon isolation** (geometric pruning of reachable futures)

Spacetime expansion increases physical volume while contracting the effective future.

---

## 7. Cosmological Observation Capacity and Temporal Scaling

To render the framework empirically tractable, we introduce a physically grounded proxy for the universe's observation capacity $O(t)$. Observation capacity is defined as the maximum rate at which informational entropy can be irreversibly converted into thermodynamic records, constrained by thermodynamics, causal connectivity, and physical memory limits.

Temporal evolution is governed by the rate of irreversible record formation.

### 7.1 Observation Capacity and Landauer Cost

Landauer's principle states that any logically irreversible erasure or stabilization of information incurs a minimum thermodynamic cost:

$$E \\geq k_B T \\ln 2 \\quad \\text{per bit}$$

We therefore define the observation capacity as:

$$O(t) \\propto \\frac{\\dot{E}_{\\text{diss}}(t)}{k_B T(t) \\ln 2}$$

where:

- $\\dot{E}_{\\text{diss}}(t)$ is the rate of irreversible free-energy dissipation
- $T(t)$ is the ambient cosmic temperature

This represents the maximum rate at which informational entropy can be converted into thermodynamic entropy.

Temporal evolution is governed by:

$$\\frac{dS_{\\text{info}}}{dt} \\propto -O(t)$$

implying that the rate of time's advance is tied directly to the universe's capacity to irreversibly commit physical records.

### 7.2 Cosmological Proxy: Star Formation as Dissipation Channel

As a first empirical approximation, we adopt the cosmic star-formation-rate density $\\dot{\\rho}_*(z)$ as a dominant channel of irreversible free-energy dissipation.

A widely used empirical fit is the Madau–Dickinson parameterization:

$$\\dot{\\rho}_*(z) = 0.015 \\frac{(1+z)^{2.7}}{1 + \\left(\\frac{1+z}{2.9}\\right)^{5.6}}$$

The cosmic background temperature evolves as:

$$T(z) = T_0 (1+z)$$

where $T_0$ is the present-day CMB temperature.

Substituting these relations:

$$O(z) \\propto \\frac{\\dot{\\rho}_*(z)}{1+z}$$

### 7.3 Predicted Temporal Dynamics

Using the proxy $O(z) \\propto \\dot{\\rho}_*(z)/(1+z)$, the framework predicts a non-monotonic temporal conversion rate across cosmic history, peaking near $z \\approx 1.5$.

**Interpretation:**

- **Early Universe** ($z \\gg 5$): High temperatures impose large Landauer costs per bit, and star formation is minimal. Observation capacity is low.

- **Cosmic Noon** ($z \\approx 1$–$3$): Star formation peaks while temperatures are moderate, yielding maximal observation capacity and maximal informational entropy collapse.

- **Late Universe** ($z \\approx 0$): Star formation declines, reducing observation capacity despite lower Landauer costs.

Thus, the effective rate of temporal evolution peaks during maximal structure formation and declines thereafter.

### 7.4 Heat Death as Temporal Cessation

As the universe approaches thermodynamic equilibrium:

$$\\dot{E}_{\\text{diss}} \\to 0$$

and therefore:

$$O(t) \\to 0 \\Rightarrow \\frac{dS_{\\text{info}}}{dt} \\to 0$$

In this limit, informational entropy no longer collapses, the now-horizon ceases to advance, and temporal evolution halts. Heat death is therefore interpreted as the exhaustion of observation capacity, not merely thermal uniformity.

### 7.5 Extensions and Refinements

Future refinements may incorporate additional dissipation channels:

- Black hole accretion and mergers
- AGN feedback
- Large-scale structure formation shocks
- Exotic dark-sector dissipation

These may dominate entropy production at late times and refine $\\dot{E}_{\\text{diss}}(t)$.

---

## 8. Heat Death as the End of Observation

Heat death corresponds to the asymptotic limit in which no free energy gradients remain and no irreversible records can be formed. Observation ceases, informational entropy collapse halts, and time ends.

---

## 9. Landauer Correspondence

This framework generalises Landauer's principle to cosmology. Each moment irreversibly erases unrealised possibilities and commits reality to a single history, incurring a thermodynamic cost. The arrow of time is the cumulative Landauer cost of erasing alternative futures.

---

## 10. Observers and Experience

Conscious observers do not uniquely cause collapse; they locally instantiate observation and experience the now-horizon as temporal flow. The universe continuously observes itself through interaction; consciousness is the subsystem where observation becomes phenomenology.

---

## 11. Computational and Simulation-Theoretic Interpretation

The structure of this framework is computational:

- **Informational entropy** → branching execution paths
- **Observation** → irreversible state commit
- **Thermodynamic entropy** → computation cost
- **Now-horizon** → execution frontier
- **Heat death** → halting state

Whether or not the universe is literally simulated, it behaves as a computation constrained by irreversibility.

---

## 12. Conclusion

Time emerges as the irreversible conversion of unobserved possibilities into physical records. The present is a horizon where observation commits reality. Informational entropy is reduced by collapse and causal horizon isolation, while thermodynamic entropy records irreversible history.

Unlike static entropy-budget models, this framework identifies observation capacity as the fundamental limiter of temporal evolution. When the universe can no longer observe—when free energy, causal connectivity, and memory capacity vanish—informational collapse ceases and time ends.

---

## Central Thesis

> **Time is the irreversible conversion of unobserved possibilities into physical records, and its rate is limited by the universe's finite capacity to observe.**

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
