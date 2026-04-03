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

*Emergent Temporality, Relativistic Time Dilation, and Dark Matter from Information Thermodynamics*

**Philip J. Hauser**

---

## Abstract

We propose a framework in which time is not a fundamental background parameter but an emergent physical process: the irreversible conversion of informational entropy into thermodynamic entropy through observation. Informational entropy is formally defined as the von Neumann entropy of the reduced density matrix of unobserved degrees of freedom. The present moment is modelled as a local "now-horizon"—a boundary in possibility space where unobserved possibilities become irreversible records. Because Landauer's principle ties the minimum cost of each irreversible bit commitment to the local temperature, the now-horizon advances at different rates across spacetime. We show this observation-cost asymmetry reproduces the structure of relativistic time dilation via the Tolman–Ehrenfest relation: time runs slower where energy density is high, not as a geometric postulate, but as a thermodynamic consequence. We further argue that mass is the informational complexity of a region's unresolved possibility space—a measure of observation resistance—and that gravity emerges as the spatial gradient of observation cost. This reinterpretation predicts that dark matter is the gravitational signature of informationally complex regions of possibility space without baryonic substrate. We test this prediction by computing the informational complexity density around a Milky Way-like galaxy, convolving a Hernquist baryonic profile with quantum field theory-motivated correlation kernels. A kernel with power-law index $n = 2.18$ (corresponding to scaling dimension $\\Delta = 1.09$, near the scalar field value) reproduces the Navarro–Frenk–White halo profile with $R^2 = 0.993$ and scale radius $R_s = 20.8$ kpc, consistent with observations. The coupling constant $\\alpha$ relating baryonic density to informational complexity is shown to be determined by a steady-state balance between quantum correlation generation and observational destruction, predicting $\\alpha \\propto M_{\\text{bar}}^{-0.491}$—in $2.0\\sigma$ agreement with the measured scaling $\\alpha \\propto M_{\\text{bar}}^{-0.594 \\pm 0.052}$ across the SPARC galaxy database. The framework thus has a single free parameter: the correlation kernel power law.

---

## Introduction

The arrow of time remains one of the deepest unresolved problems in physics. The Second Law of Thermodynamics states that entropy increases with time, but does not explain why time has a direction, why the past is fixed, or why the future appears open. General relativity describes time dilation as a consequence of spacetime geometry but offers no thermodynamic explanation for *why* clocks slow in gravitational wells or at high velocities. Meanwhile, dark matter—invoked to explain galactic rotation curves, gravitational lensing, and large-scale structure—has resisted direct detection for decades despite extensive experimental programmes [Bertone 2005, Aprile 2018].

This work proposes that these apparently separate problems share a common origin. Time is not a fundamental dimension but an emergent process defined by irreversible observation. Its local rate is governed by the thermodynamic cost of committing information to record. Mass is the informational complexity that determines that cost. Gravity is the spatial gradient of observation cost. And dark matter is the gravitational signature of informational complexity without baryonic substrate.

The framework connects to several established research programmes: Landauer's principle [Landauer 1961] provides the quantitative bridge between information and thermodynamics; the holographic principle ['t Hooft 1993, Susskind 1995] and the Bekenstein bound [Bekenstein 1981] relate entropy to geometry; Verlinde's entropic gravity [Verlinde 2011] derives gravitational dynamics from information displacement; and the "it from bit" tradition [Wheeler 1990] proposes that physical reality is fundamentally informational. Our contribution is to provide a specific, quantitative mechanism that unifies these threads and generates testable predictions.

---

## Dual Entropy Framework

We distinguish two forms of entropy:

**Informational entropy** $S_{\\text{info}}$: entropy associated with unrealised and unobserved physical possibilities. This characterises the openness of the future—the branching space of outcomes not yet committed to record.

**Thermodynamic entropy** $S_{\\text{therm}}$: entropy associated with irreversible physical records embedded in matter, radiation, and fields. This characterises the fixedness of the past.

The total entropy budget of the universe is partitioned between these two forms. Temporal evolution is the process by which $S_{\\text{info}}$ is converted into $S_{\\text{therm}}$ through irreversible observation.

---

## Formal Definition of Informational Entropy

We define informational entropy using the standard apparatus of quantum information theory. Consider a spatial region $\\mathcal{R}$ embedded in a quantum field-theoretic state $|\\Psi\\rangle$ on a Cauchy surface $\\Sigma$. The full density matrix is $\\hat{\\rho} = |\\Psi\\rangle\\langle\\Psi|$. The reduced density matrix for $\\mathcal{R}$ is obtained by tracing over its complement $\\bar{\\mathcal{R}}$:

$$\\hat{\\rho}_{\\mathcal{R}} = \\text{Tr}_{\\bar{\\mathcal{R}}}(|\\Psi\\rangle\\langle\\Psi|)$$

The informational entropy of region $\\mathcal{R}$ is the von Neumann entropy of this reduced density matrix:

$$S_{\\text{info}}(\\mathcal{R}) = -\\text{Tr}\\!\\left(\\hat{\\rho}_{\\mathcal{R}} \\ln \\hat{\\rho}_{\\mathcal{R}}\\right)$$

This is precisely the entanglement entropy of $\\mathcal{R}$ with its complement. It quantifies the amount of information about the total state that is inaccessible from within $\\mathcal{R}$—the unresolved possibilities.

### Mutual Information and Correlations

The correlations between two disjoint regions $A$ and $B$ are quantified by the mutual information:

$$I(A:B) = S_{\\text{info}}(A) + S_{\\text{info}}(B) - S_{\\text{info}}(A \\cup B)$$

In quantum field theory, for regions separated by distance $d$ in the vacuum state, the mutual information decays as [Cardy 2013, Calabrese 2004]:

$$I(A:B) \\sim \\frac{1}{d^{2\\Delta}}$$

where $\\Delta$ is the scaling dimension of the lowest-dimension operator coupling the two regions. For a free scalar field in $3+1$ dimensions, $\\Delta = 1$, giving $I \\sim 1/d^2$.

### Observation as Entropy Conversion

Observation is defined physically: any irreversible interaction that records information in the environment. By Landauer's principle [Landauer 1961], each bit of irreversible recording incurs a minimum thermodynamic cost:

$$E_{\\text{bit}} \\geq k_B T \\ln 2$$

When an observation occurs, a portion of $S_{\\text{info}}$ is converted into $S_{\\text{therm}}$: the reduced density matrix partially decoheres, entanglement between $\\mathcal{R}$ and $\\bar{\\mathcal{R}}$ is transferred to classical correlations, and irreversible records are created. The total entropy budget satisfies:

$$\\frac{dS_{\\text{info}}}{dt} = -\\Gamma(t), \\qquad \\frac{dS_{\\text{therm}}}{dt} \\geq \\Gamma(t) \\cdot k_B \\ln 2$$

where $\\Gamma(t)$ is the observation rate (bits per unit time) and the inequality reflects the Landauer bound.

### Informational Complexity Density

We define the *informational complexity density* at a point $\\mathbf{x}$ as the integrated mutual information between $\\mathbf{x}$ and all other degrees of freedom:

$$\\rho_{\\text{info}}(\\mathbf{x}) = \\int \\rho_b(\\mathbf{x}') \\, C\\!\\left(|\\mathbf{x} - \\mathbf{x}'|\\right) d^3\\mathbf{x}'$$

where $\\rho_b$ is the baryonic matter density (as the primary source of quantum degrees of freedom) and the correlation kernel

$$C(d) = \\frac{\\alpha}{(d^2 + \\epsilon^2)^{n/2}}$$

encodes the decay of mutual information with distance. Here $n = 2\\Delta$, $\\epsilon$ is a UV softening scale, and $\\alpha$ is a coupling constant.

---

## The Now-Horizon

The present moment ("now") is defined as a horizon in possibility space where unobserved possibilities become irreversible records. This boundary has properties analogous to an event horizon: irreversibility, one-way information flow, entropy generation, and separation of accessible and inaccessible states.

The now-horizon separates the *future* (unobserved, high $S_{\\text{info}}$) from the *past* (observed, fixed, $S_{\\text{info}} = 0$). Temporal flow is the propagation of this horizon through possibility space.

### Efficiency and the Topology of Collapse

Not all branches of the possibility space cost the same to collapse. In Shannon entropy, high-probability events carry less information and therefore require less thermodynamic entropy production per observation event. The Landauer cost of committing branch $i$ is:

$$E_i = -k_B T \\ln 2 \\cdot \\log_2 p_i = k_B T \\ln(1/p_i)$$

where $p_i$ is the branch probability.

High-probability branches are thermodynamically *efficient* to collapse—they represent shorter routes through informational space. The now-horizon advances fastest along these paths of least thermodynamic resistance, creating a temporal topology in which some regions of possibility space resolve faster than others. Low-probability branches persist as unresolved informational entropy, connecting naturally to quantum superposition.

---

## Local Now-Horizons and Relativistic Time Dilation

The now-horizon is *local*: because observation cost depends on local physical conditions, the rate at which $S_{\\text{info}}$ is converted into $S_{\\text{therm}}$ varies across spacetime.

### Local Observation Capacity

The local observation capacity—the maximum rate at which the now-horizon can advance—is:

$$\\mathcal{O}_{\\text{local}} = \\frac{\\dot{E}_{\\text{diss}}}{k_B T \\ln 2}$$

where $\\dot{E}_{\\text{diss}}$ is the locally available rate of free-energy dissipation and $T$ is the local temperature. In regions where the Landauer cost per bit is high, fewer bits can be committed per unit of available energy, and the now-horizon advances more slowly.

### Gravitational Time Dilation

The Tolman–Ehrenfest relation [Tolman 1930] states that in thermal equilibrium within a static gravitational field:

$$T(r) \\sqrt{g_{00}(r)} = T_\\infty = \\text{const}$$

For the Schwarzschild metric with $g_{00} = 1 - 2GM/rc^2$:

$$T(r) = \\frac{T_\\infty}{\\sqrt{1 - 2GM/rc^2}}$$

Temperature increases deeper in the gravitational well, raising the Landauer cost per bit. Simultaneously, available dissipation energy is gravitationally redshifted. An energy packet $E_\\infty$ emitted at infinity arrives at radius $r$ with energy:

$$E(r) = E_\\infty \\sqrt{g_{00}(r)}$$

The observation capacity ratio is therefore:

$$\\frac{\\mathcal{O}(r)}{\\mathcal{O}(\\infty)} = \\frac{\\dot{E}_{\\text{diss}}(r) / T(r)}{\\dot{E}_{\\text{diss}}(\\infty) / T_\\infty} = g_{00}$$

Since the rate of temporal evolution is proportional to observation capacity, and the proper time interval $d\\tau$ relates to coordinate time $dt$ through the square root of the metric component:

$$\\frac{d\\tau}{dt} = \\sqrt{\\frac{\\mathcal{O}(r)}{\\mathcal{O}(\\infty)}} = \\sqrt{g_{00}} = \\sqrt{1 - \\frac{2GM}{rc^2}}$$

This recovers the Schwarzschild time dilation factor from observation economics.

### Velocity-Based Time Dilation

For a relativistically moving observer, the causal horizon contracts. Fewer regions of possibility space are causally accessible, reducing the informational entropy available for collapse. The observer's interaction cross-section with the ambient thermal environment is relativistically modified, reducing net observation capacity by the Lorentz factor:

$$\\mathcal{O}_{\\text{moving}} = \\frac{\\mathcal{O}_{\\text{rest}}}{\\gamma}$$

This yields:

$$d\\tau = \\frac{dt}{\\gamma} = dt\\sqrt{1 - v^2/c^2}$$

recovering special-relativistic time dilation from observation capacity constraints.

### Interpretation

This section does not claim to replace relativity. It proposes that the *thermodynamic reason* time dilates is that observation is more expensive in high-energy-density or high-velocity environments. Relativity describes the geometry; this framework offers a candidate mechanism for why the geometry has the temporal structure it does. If time dilation is a consequence of observation economics, spacetime geometry may itself be emergent from thermodynamic constraints on information processing—consistent with holographic ['t Hooft 1993, Susskind 1995] and entropic [Verlinde 2011] gravity programmes.

---

## Mass as Observation Resistance

### The Dual Role of Mass

Through $E = mc^2$, mass plays a dual role in this framework:

**Mass as observation fuel.** Energy is the currency that funds the Landauer cost of collapsing $S_{\\text{info}}$ into $S_{\\text{therm}}$. Mass-energy represents the total budget available for irreversible state commitment.

**Mass as observation resistance.** Via the Tolman–Ehrenfest relation, mass raises the local temperature, increasing the Landauer cost per bit. Mass-dense regions have large observation budgets but low efficiency per bit committed.

### Mass as Informational Complexity

The deeper claim is that mass may be *emergent* from informational structure. A region with many entangled, high-information-content, unresolved possibilities is expensive to observe. It resists now-horizon advance. It behaves exactly as if it has mass. In this interpretation, mass is a measure of the informational complexity of a region's unresolved possibility space—its observation resistance density.

### Gravity as the Observation Cost Gradient

If mass is observation resistance density, then gravity is the spatial gradient of observation cost:

$$\\mathbf{g}(\\mathbf{x}) \\propto -\\nabla \\left[\\frac{k_B T(\\mathbf{x}) \\ln 2}{\\dot{E}_{\\text{diss}}(\\mathbf{x})}\\right]$$

Objects follow trajectories that minimise the integrated observation cost—the geodesic equation reinterpreted as a statement about informational economics. This is structurally equivalent to Verlinde's entropic gravity [Verlinde 2011] but derived from a different starting point.

### The Bekenstein Bound as an Accounting Identity

The Bekenstein bound [Bekenstein 1981] states:

$$S \\leq \\frac{2\\pi k_B R E}{\\hbar c}$$

In this framework, the bound acquires a natural interpretation: a region cannot contain more unresolved informational entropy ($S_{\\text{info}}$) than its mass-energy budget ($E$) can eventually collapse at the minimum Landauer cost. The bound is an accounting identity: informational debt cannot exceed the observation budget.

---

## Gravity as Statistical Bias in Possibility Space

The observation-cost gradient formulation of gravity is mathematically precise but obscures a deeper insight: gravity is not a force, a geometric distortion, or even a cost gradient. It is a *statistical bias in the branching structure of informational entropy*.

### The Probability-Weighted Branch Structure

Consider an object near a massive body. Its future possibility space branches in all directions—it could, in principle, move any way. But these branches are not equally weighted. The informational complexity density surrounding the mass creates an asymmetric probability distribution over future branches.

Branches in which the object moves *toward* the mass are overwhelmingly more probable than branches in which it moves away. This is because the region near the mass has higher informational complexity: more correlated degrees of freedom, more entangled quantum states, more interaction pathways through which the object can decohere and become correlated with its environment. Moving toward the mass means moving into a denser web of correlations—more possible interactions, more possible decoherence pathways, more ways for the quantum state to evolve. Moving away means moving into sparser informational territory.

From the now-horizon discussion, the now-horizon preferentially collapses high-probability branches because they are thermodynamically cheapest: lower information content per branch, lower Landauer cost per observation event. The universe does not "choose" the gravitational trajectory. The gravitational trajectory is simply the cheapest branch to collapse, so it is resolved first.

### Reconciling Efficiency and Gravitation

There is an apparent tension in the framework that must be resolved. The now-horizon advances fastest along high-probability, low-cost branches—the efficiency principle. Yet gravity pulls objects *toward* high-informational-complexity regions, where the Landauer cost per bit is *higher* and the now-horizon advances more slowly. If the universe favours cheap branches, why does it steer matter toward expensive regions?

The resolution is that these operate at different scales. Individual branch collapses follow the efficiency gradient: each single observation event preferentially resolves the cheapest available possibility. But the *bulk trajectory* of an object through space follows the **maximum entropy production** gradient: it moves toward regions where the *total* rate of thermodynamic entropy generation is highest.

A region of high informational complexity is expensive per bit but offers an enormous *density* of collapsible branches—more correlated degrees of freedom, more decoherence pathways, more opportunities for irreversible recording. Although each individual collapse costs more Landauer energy, there are far more collapses available per unit volume. The total entropy production rate along paths toward the mass exceeds the rate along paths away from it.

This is analogous to fluid flow. Water does not flow toward the location where each molecule moves most freely. It flows downhill—toward the configuration that maximises the total conversion of gravitational potential energy into thermal energy. Individual molecules undergo random thermal motion, but the bulk flow follows the maximum dissipation gradient. The now-horizon behaves identically: individual branch collapses follow the efficiency gradient (cheapest first), but the aggregate flow of the now-horizon follows the maximum entropy production gradient—which is gravity.

*Gravity is the path of maximum total entropy production through the informational landscape.*

### The Mass–Observation Feedback Loop

The relationship between informational complexity and mass creates a self-reinforcing feedback loop with significant physical consequences.

As the now-horizon pushes into an informationally dense region and collapses possibilities, it generates thermodynamic entropy. Each collapse event has a Landauer cost of at least $k_B T \\ln 2$ per bit, and this cost is paid in dissipated energy. That dissipated energy *is* mass-energy (via $E = mc^2$). The thermodynamic entropy produced by observation contributes to the local energy density, which raises the local temperature via the Tolman–Ehrenfest relation, which increases the Landauer cost of future observations, which further slows the now-horizon.

The cycle is:

$$\\text{High } S_{\\text{info}} \\xrightarrow{\\text{collapse}} \\text{High } S_{\\text{therm}} \\xrightarrow{\\text{Landauer}} \\text{High } E \\xrightarrow{E=mc^2} \\text{High } m \\xrightarrow{\\text{Tolman}} \\text{High } T \\xrightarrow{\\text{cost}} \\text{Slow now-horizon}$$

This feedback loop may provide an informational mechanism for gravitational collapse. Matter clumps not merely because geometry curves, but because observation in informationally dense regions generates mass-energy that makes those regions more informationally dense. The process is self-amplifying: mass generates more mass through the thermodynamic cost of resolving its own informational complexity.

The feedback loop also suggests a natural explanation for structure formation in the early universe. Regions with slightly higher initial informational complexity would collapse possibilities slightly faster, generating slightly more thermodynamic entropy, producing slightly more effective mass, attracting more matter, increasing the informational complexity further. Small initial asymmetries in the informational landscape would be amplified into large-scale structure—galaxies, clusters, and filaments—through this self-reinforcing mechanism.

### Black Holes as Informational Saturation

The mass–observation feedback loop runs to completion in a black hole. As informational complexity increases without bound, the Landauer cost per bit diverges, and the now-horizon asymptotically halts.

At the event horizon, the feedback loop reaches a critical threshold: the informational density is so high, and the Landauer cost so extreme, that no finite energy budget can collapse even a single additional bit. The now-horizon freezes. This is why time stops at the event horizon—not because of infinite spacetime curvature in the geometric sense, but because the observation cost per bit has diverged.

The singularity, in this interpretation, is the point of infinite informational complexity: an infinite density of unresolved possibilities that no amount of energy can ever collapse. The Bekenstein–Hawking entropy of a black hole,

$$S_{\\text{BH}} = \\frac{k_B c^3 A}{4 G \\hbar}$$

represents the total informational entropy trapped behind the horizon—possibilities that have been permanently removed from the observable universe's collapse budget without being resolved.

Hawking radiation acquires a natural interpretation: it is the slow leakage of informational complexity back across the horizon, driven by quantum fluctuations that occasionally push bits across the observation-cost barrier. The black hole information paradox becomes a question about whether the specific *structure* of the trapped informational entropy (which particular possibilities were frozen) is preserved in the radiation, or whether only the total *count* survives.

### Orbits as Observation-Efficient Trajectories

In general relativity, orbits are geodesics—paths that extremise proper time. Since proper time in this framework is the accumulated observation along a worldline (the number of bits of $S_{\\text{info}}$ collapsed by the local now-horizon), a geodesic is the trajectory that maximises total observation for a given energy budget.

A circular orbit represents the equilibrium between two competing observation costs:

**Gravitational observation cost.** Deeper in the well, the Tolman–Ehrenfest relation raises the local temperature and the Landauer cost per bit. Falling inward means entering a regime of more expensive observation.

**Kinetic observation cost.** Higher velocity contracts the causal horizon and reduces observation capacity. Speeding up makes observation more expensive.

A radial plunge compounds both costs—the object is deep in the well *and* moving fast, and its now-horizon crawls. A circular orbit balances the two: the gravitational cost gradient pulling inward is exactly compensated by the velocity-dependent cost resisting further acceleration. The planet's now-horizon advances at a steady, optimised rate.

Elliptical orbits are oscillations around this equilibrium. At periapsis, both costs are high and the now-horizon advances slowly; at apoapsis, both costs are low and the now-horizon advances faster. Conservation of energy along the orbit is the conservation of the total observation budget: gravitational cost plus kinetic cost remains constant. Conservation of angular momentum is the preservation of the rotational correlation structure in possibility space—a pattern of entangled possibilities that persists unless disrupted by an external observation event.

### Galaxy Rotation Curves

In standard gravity with only baryonic matter, orbital velocity should fall as $v \\propto 1/\\sqrt{r}$ beyond the visible disc. Observed rotation curves are flat to large radii. In this framework, stars in the outer galaxy are not orbiting the visible mass alone. They are following the probability-weighted branch structure of the full informational complexity landscape, which includes the quantum correlations propagating outward from the galactic core:

$$\\frac{v^2}{r} = \\frac{G\\left[M_{\\text{baryonic}}(r) + M_{\\text{info}}(r)\\right]}{r^2}$$

where $M_{\\text{info}}(r)$ is the effective mass enclosed within radius $r$ from the informational complexity profile $\\rho_{\\text{info}}(r)$. Since the NFW-like informational complexity profile falls off more slowly than the baryonic profile, the enclosed effective mass continues to grow with radius, keeping $v$ approximately constant.

### Universality of Gravity

This formulation resolves a foundational puzzle: *why is gravity universal?* Why does it affect all matter equally, regardless of composition?

In Newtonian mechanics, this is a brute empirical fact (equivalence of inertial and gravitational mass). In general relativity, it is elevated to the equivalence principle, which is axiomatic. In this framework, it is a *consequence*: gravity is not a force coupling to a specific property of matter through a charge or quantum number. It is the statistical structure of possibility space itself. Every physical system has a branching future; every branching future has a probability distribution; that distribution is shaped by the informational complexity landscape. Universality follows because nothing can opt out of the probability distribution over its own future branches.

This also clarifies why freefall is locally indistinguishable from inertial motion—the weak equivalence principle. An object in freefall is not being acted on by any force. It is following the maximum-probability path through its own possibility space. There is nothing to feel, because there is no deviation from the statistically preferred trajectory.

### Newton's Laws as Informational Statements

Newton's three laws acquire natural informational restatements:

**First Law** (inertia): In the absence of an informational complexity gradient, all directional branches are equally weighted. There is no preferred cheap path, and the existing trajectory—the already-committed correlation structure—persists.

**Second Law** ($F = ma$): The rate of change of branch selection is proportional to the observation-cost gradient. Mass $m$ is the informational complexity that resists changes in branch trajectory; force $F$ is the gradient of the informational complexity landscape; acceleration $a$ is the resulting shift in the probability distribution over future branches.

**Third Law** (action–reaction): When two systems interact, each modifies the other's informational complexity landscape symmetrically. The observation-cost gradient imposed by $A$ on $B$ equals the gradient imposed by $B$ on $A$, because mutual information is symmetric: $I(A:B) = I(B:A)$.

---

## Dark Matter as Informational Complexity

If mass is the informational complexity of a region's unresolved possibility space, then gravitational effects do not require baryonic matter—they require informationally complex regions where the now-horizon is expensive to advance.

### The Proposal

Dark matter, in this framework, is not a particle. It is the gravitational signature of regions where the informational possibility structure is dense and entangled—where complex branching structures create observation-cost gradients—without that complexity being expressed as visible baryonic matter.

This resolves the two deepest puzzles simultaneously: dark matter does not interact electromagnetically because it is informational structure rather than material substance (there is no particle to scatter photons), and direct detection experiments fail because there is no particle to detect.

### Informational Complexity Profile

The informational complexity density at radius $r$ from a galaxy with baryonic profile $\\rho_b$ is:

$$\\rho_{\\text{info}}(r) = \\alpha \\int \\rho_b(\\mathbf{r}') \\, C(|\\mathbf{r} - \\mathbf{r}'|) \\, d^3\\mathbf{r}'$$

For a spherically symmetric baryonic distribution, this reduces to:

$$\\rho_{\\text{info}}(r) = \\alpha \\int_0^\\infty \\rho_b(r') \\, K_n(r, r') \\, 4\\pi r'^2 \\, dr'$$

where $K_n(r, r')$ is the angular average of the correlation kernel:

$$K_n(r, r') = 2\\pi \\int_0^\\pi \\frac{\\sin\\theta}{(r^2 + r'^2 - 2rr'\\cos\\theta + \\epsilon^2)^{n/2}} \\, d\\theta$$

The prediction is that $\\rho_{\\text{info}}(r)$ should match the observed NFW dark matter halo profile [Navarro 1996]:

$$\\rho_{\\text{NFW}}(r) = \\frac{\\rho_0}{(r/R_s)(1 + r/R_s)^2}$$

### Numerical Computation

We test this prediction numerically for a Milky Way-like galaxy. The baryonic matter is modelled with a Hernquist profile [Hernquist 1990]:

$$\\rho_b(r) = \\frac{M_b \\, a_b}{2\\pi \\, r \\, (r + a_b)^3}$$

with total mass $M_b = 5 \\times 10^{10} \\, M_\\odot$ and scale radius $a_b = 3$ kpc.

We compute $\\rho_{\\text{info}}(r)$ by numerical quadrature over the spherical convolution, using a UV softening length $\\epsilon = 0.05$ kpc, and scan over the kernel power-law index $n$.

| Kernel | $R^2$ (NFW fit) | $R_s$ (kpc) | $\\Delta$ |
|--------|-----------------|-------------|----------|
| $n = 1.0$ | 0.814 | — | 0.50 |
| $n = 1.5$ | 0.988 | 262.6 | 0.75 |
| $n = 2.0$ | 0.992 | 37.6 | 1.00 |
| $n = 2.18$ | **0.993** | **20.8** | **1.09** |
| $n = 2.5$ | 0.995 | 7.8 | 1.25 |
| $n = 3.0$ | 0.990 | 1.7 | 1.50 |

*NFW fit results for different correlation kernel power laws. $R^2$ is computed in log-space. The optimal kernel $n = 2.18$ ($\\Delta = 1.09$) reproduces $R_s = 20.8$ kpc with $R^2 = 0.993$.*

The key result is that a kernel with $n = 2.18$, corresponding to scaling dimension $\\Delta = 1.09$, reproduces the NFW profile with $R^2 = 0.993$ and scale radius $R_s = 20.8$ kpc—consistent with observational estimates for the Milky Way halo ($R_s \\approx 15$–$25$ kpc [Nesti 2013]).

The value $\\Delta \\approx 1.09$ is remarkably close to the free scalar field scaling dimension $\\Delta = 1$ in $3+1$ dimensions. The slight deviation (~9%) may reflect gravitational corrections to the conformal scaling, renormalization effects, or contributions from higher-spin operators. A precise derivation of $\\Delta$ from the gravitational sector of the QFT is an open problem.

### The Bullet Cluster

The Bullet Cluster [Clowe 2006]—where gravitational lensing separated from the hot gas during a cluster collision—has a natural explanation. The gas collision is a massive observation event: informational entropy is rapidly collapsed as gas shocks, heats, and radiates. This *reduces* local informational complexity. However, the long-range causal correlations encoding the informational structure of the galaxy population pass through the collision intact. The lensing signal separates from the gas because information *processing* (the gas shock) and informational *structure* (the entangled possibility space) are distinct: the former destroys local complexity, the latter persists.

### Distribution and Halo Structure

Dark matter halos concentrate around galaxies and large-scale structure—exactly where this framework predicts the highest informational complexity. Galaxies are regions of intense causal entanglement: billions of stars, feedback loops, magnetic fields, and gravitational interactions create a dense web of correlated possibilities. The halo is the informational shadow of this complexity extending beyond the visible matter.

---

## Steady-State Coupling: Deriving α from the Feedback Loop

The NFW calculation introduces a coupling constant $\\alpha$ relating baryonic density to informational complexity density. If $\\alpha$ were a free parameter for each galaxy, the framework would have limited predictive power. We now show that the mass–observation feedback loop determines $\\alpha$ from galaxy structure, reducing the framework to a single free parameter.

### Steady-State Equation

The informational complexity density at radius $r$ from a galaxy evolves through two competing processes:

$$\\frac{\\partial \\rho_{\\text{info}}}{\\partial t} = \\mathcal{G}(r) - \\mathcal{D}(r)$$

The *generation rate* $\\mathcal{G}(r)$ arises from quantum correlations propagating outward from baryonic matter:

$$\\mathcal{G}(r) = \\gamma \\int \\rho_b(\\mathbf{r}') \\, C(|\\mathbf{r} - \\mathbf{r}'|) \\, d^3\\mathbf{r}'$$

where $\\gamma$ is the intrinsic correlation generation rate per unit baryonic mass.

The *destruction rate* $\\mathcal{D}(r)$ is the rate at which observation collapses informational complexity. This is proportional to both the existing complexity (more complexity means more to collapse) and the local observation capacity, which depends on the available energy flux:

$$\\mathcal{D}(r) = \\rho_{\\text{info}}(r) \\cdot \\frac{\\eta \\, F(r)}{k_B T \\ln 2}$$

where $F(r) = L / (4\\pi r^2)$ is the radiative energy flux from a galaxy of luminosity $L$, and $\\eta$ is an efficiency factor.

### Steady-State Solution

At equilibrium ($\\partial \\rho_{\\text{info}} / \\partial t = 0$):

$$\\rho_{\\text{info}}(r) = \\frac{\\gamma \\, k_B T \\ln 2}{\\eta \\, F(r)} \\int \\rho_b(\\mathbf{r}') \\, C(|\\mathbf{r} - \\mathbf{r}'|) \\, d^3\\mathbf{r}'$$

Comparing with the informational complexity profile equation, the effective coupling constant is:

$$\\alpha_{\\text{eff}} = \\frac{\\gamma \\, k_B T \\ln 2}{\\eta \\, F(R_{\\text{char}})}$$

evaluated at a characteristic halo radius $R_{\\text{char}}$.

Since $F \\propto L / R_{\\text{char}}^2$ and $L \\propto M_{\\text{bar}}$ (at fixed mass-to-light ratio):

$$\\alpha_{\\text{eff}} \\propto \\frac{R_{\\text{char}}^2}{M_{\\text{bar}}}$$

### Predicted Scaling Exponent

If the characteristic halo size scales with baryonic mass as $R_{\\text{char}} \\propto M_{\\text{bar}}^\\delta$, then:

$$\\alpha_{\\text{eff}} \\propto M_{\\text{bar}}^{2\\delta - 1}$$

This is a testable prediction: the exponent of the $\\alpha$–$M$ relation is determined by the galaxy size–mass relation.

### Test Against SPARC Data

We test this prediction using the SPARC database [Lelli 2016] of 175 disk galaxies with Spitzer photometry and high-quality rotation curves.

**Step 1: Size–mass relation.** From the SPARC photometry, we measure the half-light radius $R_{1/2}$ for each galaxy and fit the scaling relation. The result is:

$$R_{1/2} \\propto M_{\\text{bar}}^{0.255 \\pm 0.016} \\qquad (r = 0.78, \\; p = 1.2 \\times 10^{-35})$$

**Step 2: Predicted exponent.** With $\\delta = 0.255$:

$$\\alpha_{\\text{eff}} \\propto M_{\\text{bar}}^{2(0.255) - 1} = M_{\\text{bar}}^{-0.491}$$

**Step 3: Measured exponent.** We fit the informational complexity model to each SPARC galaxy's rotation curve individually, optimising $\\alpha$ per galaxy at fixed kernel power $n$. The resulting $\\alpha$ values correlate strongly with baryonic mass:

$$\\alpha_{\\text{measured}} \\propto M_{\\text{bar}}^{-0.594 \\pm 0.052} \\qquad (r = -0.68, \\; p = 3.6 \\times 10^{-22})$$

**Result:** The predicted exponent ($-0.491$) agrees with the measured exponent ($-0.594 \\pm 0.052$) to within $2.0\\sigma$. The steady-state feedback equation, combined with the observed galaxy size–mass relation, predicts the mass-dependent coupling constant without fitting.

### Physical Interpretation

The scaling $\\alpha_{\\text{eff}} \\propto R^2 / M$ has a direct physical interpretation: more massive galaxies have higher observation capacity per unit solid angle, destroying informational complexity faster and leaving less in the halo per unit baryonic mass. The surviving fraction—which manifests as the dark matter effect—is governed by the balance between quantum correlation generation and observational destruction.

The residual ~20% discrepancy between the predicted and measured exponents ($-0.491$ vs. $-0.594$) suggests that the destruction rate scales slightly steeper with mass than simple $L/R^2$. This could reflect enhanced observational efficiency in more massive galaxies due to higher stellar densities and more correlated decoherence events per unit luminosity—a correction of the form $\\mathcal{D} \\propto M_{\\text{bar}}^{1+\\epsilon} / R^2$ with $\\epsilon \\approx 0.05$ would close the gap.

### Parameter Count

With $\\alpha$ determined by the scaling relation, the framework has a single truly free parameter: the kernel power-law index $n$ (or equivalently the scaling dimension $\\Delta = n/2$). This is comparable to MOND, which has one free parameter ($a_0 = 1.2 \\times 10^{-10}$ m/s²), and fewer free parameters per galaxy than standard NFW dark matter models (which require two halo parameters per galaxy, constrained by the concentration–mass relation).

---

## Decomposition of Spacetime

If time is an emergent process and mass-gravity is an emergent property of the observation-cost landscape, then "spacetime" as a unified geometric object is an effective description, not fundamental.

Space is the arena of informational relationships between possible observations. Time is what happens when those relationships are irreversibly resolved. The metric tensor encodes how observation costs vary across the informational landscape.

This implies a preferred structure that general relativity's diffeomorphism invariance explicitly denies: the now-horizon is a physically real boundary defined by thermodynamic irreversibility, not an arbitrary coordinate choice. The spatial metric may also emerge from informational structure: two events are "far apart" because collapsing the informational entropy between them requires many intermediate observation steps. Spatial distance is informational distance.

---

## Causal Horizons and Possibility Pruning

Cosmic expansion produces causal horizons beyond which events cannot influence an observer. Informational entropy is reduced by two mechanisms:

1. **Collapse via observation**: high-probability branches are irreversibly committed to record.
2. **Horizon isolation**: entire branches become causally inaccessible and are pruned from the effective possibility space.

Spacetime expansion increases physical volume while contracting the effective future.

---

## Cosmological Observation Capacity

The global observation capacity is:

$$\\mathcal{O}(t) = \\frac{\\dot{E}_{\\text{diss}}(t)}{k_B T(t) \\ln 2}$$

As a first approximation, we adopt the cosmic star-formation-rate density $\\dot{\\rho}_*(z)$ as the dominant dissipation channel, using the Madau–Dickinson parameterization [Madau 2014]:

$$\\dot{\\rho}_*(z) = 0.015 \\frac{(1+z)^{2.7}}{1 + \\left(\\frac{1+z}{2.9}\\right)^{5.6}} \\quad M_\\odot \\, \\text{yr}^{-1} \\, \\text{Mpc}^{-3}$$

With $T(z) = T_0(1+z)$:

$$\\mathcal{O}(z) \\propto \\frac{\\dot{\\rho}_*(z)}{1+z}$$

This predicts a non-monotonic temporal conversion rate peaking near $z \\approx 1.5$. The early universe ($z \\gg 5$) has low observation capacity due to high Landauer costs. Cosmic noon ($z \\approx 1$–$3$) maximises observation capacity. The late universe ($z \\approx 0$) sees declining capacity as star formation wanes. The universe's temporal grain—the rate at which it resolves its own future—has a peak, and we are past it.

### Heat Death as Temporal Cessation

As the universe approaches thermodynamic equilibrium:

$$\\dot{E}_{\\text{diss}} \\to 0 \\implies \\mathcal{O}(t) \\to 0 \\implies \\frac{dS_{\\text{info}}}{dt} \\to 0$$

Heat death is the exhaustion of observation capacity—not merely thermal uniformity, but the end of time.

---

## Empirical Predictions

The framework generates several testable predictions:

1. **Gravitational time dilation** emerges from the Tolman–Ehrenfest relation applied to observation capacity.

2. **Velocity time dilation** emerges from Lorentz contraction of causal horizons reducing available informational entropy.

3. **NFW dark matter halo profiles** are reproduced by the informational complexity density with a near-scalar-field correlation kernel ($\\Delta \\approx 1.09$, $R_s = 20.8$ kpc, $R^2 = 0.993$).

4. **Non-monotonic cosmic temporal rate** peaking at $z \\approx 1.5$, tracking the observation capacity proxy.

5. **Bullet Cluster separation** follows from the distinction between information processing and informational structure.

6. **Bekenstein bound** is an accounting identity: maximum $S_{\\text{info}}$ equals the observation budget of a region.

7. **Direct dark matter detection will continue to fail** if dark matter is informational structure rather than particles.

8. **The scaling dimension** $\\Delta$ governing the correlation kernel should be derivable from quantum gravity and should be approximately $1.09$ or, if renormalization corrections are included, converge to a specific value near unity.

9. **The α–M scaling exponent** is predicted by the steady-state feedback equation to be $\\beta = 2\\delta - 1$, where $\\delta$ is the galaxy size–mass exponent. From SPARC data, $\\delta = 0.255 \\pm 0.016$, yielding a predicted $\\beta = -0.491$. The measured value is $\\beta = -0.594 \\pm 0.052$, agreeing to $2.0\\sigma$. This eliminates $\\alpha$ as a free parameter.

10. **Flat galaxy rotation curves** follow from the rotation equation: stars orbit the full informational complexity landscape, not just the baryonic mass, producing $v \\approx \\text{const}$ at large radii without invoking particle dark matter.

11. **Universality of gravity** (the equivalence principle) is a consequence rather than an axiom: all systems experience gravity because all systems have branching futures shaped by the same informational complexity landscape.

12. **Newton's third law** is a consequence of the symmetry of mutual information: $I(A:B) = I(B:A)$ implies that the observation-cost gradient imposed by $A$ on $B$ equals that imposed by $B$ on $A$.

13. **Gravitational collapse** is driven by the mass–observation feedback loop: regions of higher informational complexity generate more thermodynamic entropy through observation, producing more effective mass, which amplifies the complexity further.

14. **Black hole event horizons** correspond to the divergence of observation cost per bit: the now-horizon freezes when the feedback loop between informational density and Landauer cost reaches a critical threshold.

15. **Hawking radiation** is the leakage of informational complexity back across the observation-cost barrier, and the black hole information paradox reduces to whether the *structure* of the frozen informational entropy is preserved in the radiation.

---

## Discussion

### Relation to Existing Frameworks

This framework intersects with several established programmes. Verlinde's entropic gravity [Verlinde 2011] derives Newton's law from entropy gradients on holographic screens; our approach provides a specific mechanism (Landauer cost of temporal evolution) and extends it to predict dark matter profiles. The holographic principle ['t Hooft 1993, Susskind 1995] bounds entropy by area; we reinterpret this as an accounting constraint on observation budgets. The ER=EPR conjecture [Maldacena 2013] links spacetime geometry to entanglement; our framework provides a thermodynamic channel through which entanglement structures produce effective mass.

### Limitations and Open Questions

The gravitational time dilation derivation uses the Tolman–Ehrenfest relation as input, which presupposes general relativity. A fully self-consistent derivation would require deriving the metric from informational first principles—showing that the observation-cost landscape *produces* the Einstein field equations, not merely is consistent with them.

The velocity-based time dilation argument is qualitative. A rigorous treatment would require specifying exactly how relativistic boosts modify the observation capacity through the thermal environment.

The NFW calculation demonstrates that the *shape* of the informational complexity profile matches observations, but the *normalisation*—the ratio of informational complexity to baryonic mass—is a free parameter. Determining this ratio from first principles requires a full quantum gravitational calculation.

The value $\\Delta = 1.09$ is an empirical fit. Deriving this from the gravitational sector of quantum field theory is an important open problem that would constitute a strong test of the framework.

### Computational Interpretation

The framework has a natural computational reading:

- $S_{\\text{info}}$ ↔ branching execution paths
- Observation ↔ irreversible state commit
- Now-horizon ↔ execution frontier
- Efficiency gradient ↔ branch prediction / speculative execution
- Mass ↔ computational complexity density
- Gravity ↔ maximum-throughput routing (bulk flow toward highest processing density)
- Orbits ↔ steady-state execution loops optimising throughput
- Feedback loop ↔ runaway resource allocation (computation generates load)
- Black holes ↔ stack overflow (computational debt exceeds all possible budgets)
- Dark matter ↔ allocated but unrendered computational structure
- Newton's Third Law ↔ symmetric mutual information: $I(A:B) = I(B:A)$

Whether or not the universe is literally a computation, it behaves as one constrained by irreversibility, whose local clock rate is determined by the thermodynamic cost of state commitment, whose dynamics are governed by the statistical structure of the branch space, and whose large-scale structure emerges from the self-reinforcing feedback between computation and computational cost.

---

## Conclusion

Time emerges as the irreversible conversion of unobserved possibilities into physical records. The present is a local horizon where observation commits reality, and its rate of advance is governed by the thermodynamic cost of that commitment.

Mass is the informational complexity that determines observation cost. Gravity is a statistical bias in the branching structure of possibility space: objects follow trajectories of maximum total entropy production, moving toward regions where the density of collapsible branches is highest. Individual observation events follow the efficiency gradient (cheapest branch first); bulk trajectories follow the entropy production gradient (most total dissipation). Orbits are observation-efficient equilibria. The universality of gravity follows because all systems inhabit the same possibility space.

The relationship between informational complexity and mass is self-reinforcing: observation in informationally dense regions generates thermodynamic entropy, which contributes mass-energy, which raises the Landauer cost, which slows the now-horizon further. This feedback loop drives gravitational collapse and structure formation. In its extremal limit, it produces black holes—regions where the observation cost per bit diverges and the now-horizon halts.

Dark matter is the gravitational signature of informationally complex regions of possibility space that lack baryonic substrate. The informational complexity density around a Milky Way-like galaxy, computed from quantum field theory-motivated correlation kernels, reproduces the NFW dark matter halo profile with $R^2 = 0.993$ and predicts flat rotation curves without invoking particle dark matter. The coupling constant governing the information–gravity connection is not free: it is determined by the steady-state balance between correlation generation and observational destruction, yielding a predicted mass scaling $\\alpha \\propto M^{-0.491}$ that agrees with the measured $\\alpha \\propto M^{-0.594 \\pm 0.052}$ across 171 SPARC galaxies to within $2\\sigma$. The framework has a single free parameter: the correlation kernel power law.

Spacetime geometry is an effective encoding of the observation-cost landscape. Relativity is observation economics. Gravity is the path of maximum entropy production through the informational landscape.

---

## Acknowledgments

The author thanks Claude (Anthropic) for extensive discussion and computational assistance in developing this framework.

---

## References

1. R. Landauer, "Irreversibility and Heat Generation in the Computing Process," *IBM J. Res. Dev.* **5**, 183 (1961).
2. J. D. Bekenstein, "Universal upper bound on the entropy-to-energy ratio for bounded systems," *Phys. Rev. D* **23**, 287 (1981).
3. G. 't Hooft, "Dimensional Reduction in Quantum Gravity," arXiv:gr-qc/9310026 (1993).
4. L. Susskind, "The world as a hologram," *J. Math. Phys.* **36**, 6377 (1995).
5. E. Verlinde, "On the origin of gravity and the laws of Newton," *JHEP* **2011**, 029 (2011).
6. J. A. Wheeler, "Information, physics, quantum: The search for links," in *Complexity, Entropy, and the Physics of Information* (Addison-Wesley, 1990).
7. J. F. Navarro, C. S. Frenk, and S. D. M. White, "The Structure of Cold Dark Matter Halos," *Astrophys. J.* **462**, 563 (1996).
8. L. Hernquist, "An analytical model for spherical galaxies and bulges," *Astrophys. J.* **356**, 359 (1990).
9. P. Madau and M. Dickinson, "Cosmic Star-Formation History," *Annu. Rev. Astron. Astrophys.* **52**, 415 (2014).
10. R. C. Tolman, "On the Weight of Heat and Thermal Equilibrium in General Relativity," *Phys. Rev.* **35**, 904 (1930).
11. D. Clowe et al., "A Direct Empirical Proof of the Existence of Dark Matter," *Astrophys. J. Lett.* **648**, L109 (2006).
12. G. Bertone, D. Hooper, and J. Silk, "Particle dark matter: evidence, candidates and constraints," *Phys. Rep.* **405**, 279 (2005).
13. E. Aprile et al. (XENON Collaboration), "Dark Matter Search Results from a One Ton-Year Exposure of XENON1T," *Phys. Rev. Lett.* **121**, 111302 (2018).
14. F. Nesti and P. Salucci, "The Dark Matter halo of the Milky Way, AD 2013," *JCAP* **2013**, 016 (2013).
15. P. Calabrese and J. Cardy, "Entanglement entropy and quantum field theory," *J. Stat. Mech.* **0406**, P06002 (2004).
16. J. Cardy, "Some results on the mutual information of disjoint regions in higher dimensions," *J. Phys. A* **46**, 285402 (2013).
17. J. Maldacena and L. Susskind, "Cool horizons for entangled black holes," *Fortsch. Phys.* **61**, 781 (2013).
18. F. Lelli, S. S. McGaugh, and J. M. Schombert, "SPARC: Mass Models for 175 Disk Galaxies with Spitzer Photometry and Accurate Rotation Curves," *Astron. J.* **152**, 157 (2016).

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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem 2rem 0',
      }}>
        <a
          href="/paper.tex"
          download="time_as_entropy_conversion_v2.tex"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            background: 'rgba(100, 150, 255, 0.1)',
            border: '1px solid rgba(100, 150, 255, 0.3)',
            borderRadius: '6px',
            color: '#88aaff',
            fontSize: '0.9rem',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(100, 150, 255, 0.2)';
            e.currentTarget.style.borderColor = '#88aaff';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(100, 150, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(100, 150, 255, 0.3)';
            e.currentTarget.style.color = '#88aaff';
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Download LaTeX Source (.tex)
        </a>
      </div>
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
