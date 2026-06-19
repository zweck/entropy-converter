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

*June 18, 2026*

---

## Abstract

We propose a framework in which time is not a fundamental background parameter but an emergent physical process: the irreversible conversion of informational entropy into thermodynamic entropy through observation. Informational entropy is formally defined as the von Neumann entropy of the reduced density matrix of unobserved degrees of freedom. The present moment is modelled as a local "now-horizon"—a boundary in possibility space where unobserved possibilities become irreversible records. Because Landauer's principle ties the minimum cost of each irreversible bit commitment to the local temperature, the now-horizon advances at different rates across spacetime. We show this observation-cost asymmetry reproduces the structure of relativistic time dilation via the Tolman–Ehrenfest relation: time runs slower where energy density is high, not as a geometric postulate, but as a thermodynamic consequence. We further argue that mass is the informational complexity of a region's unresolved possibility space—a measure of observation resistance—and that gravity emerges as the spatial gradient of observation cost. This reinterpretation predicts that dark matter is the gravitational signature of informationally complex regions of possibility space without baryonic substrate. We test this prediction by computing the informational complexity density around a Milky Way-like galaxy, convolving a Hernquist baryonic profile with quantum field theory-motivated correlation kernels; the resulting profile reproduces the Navarro–Frenk–White halo shape with $R^2 = 0.99$ across a broad plateau of kernel exponents consistent with the free scalar field scaling dimension $\\Delta = 1$. The coupling constant $\\alpha$ relating baryonic density to informational complexity is shown to be determined by a steady-state balance between quantum correlation generation and observational destruction, predicting $\\alpha \\propto M_{\\text{bar}}^{-0.491}$—in $2.0\\sigma$ agreement with the measured scaling $\\alpha \\propto M_{\\text{bar}}^{-0.594 \\pm 0.052}$ across the SPARC galaxy database. Tested against stacked weak gravitational lensing profiles from KiDS-1000, the model outperforms NFW dark matter fits in all four stellar mass bins using 2 global parameters versus 8. The correlation kernel exhibits a consistent scale dependence—softer in dense inner halos, steeper in sparse outer regions—and the bare (sparse-regime) exponent is jointly measured at $n_{\\text{outer}} = 2.05 \\pm 0.04$, placing the parameter-free free-scalar-field prediction $n = 2$ at $1.3\\sigma$. A two-zone model with the outer kernel fixed at this predicted value and a single fitted dressing depth improves the global lensing fit by $\\Delta\\chi^2 = -156$ at equal parameter count ($\\chi^2_r \\approx 2.9$ versus $\\approx 8.9$ for NFW). The framework's central exponent is thus a QFT prediction with measured environmental dressing; the dressing depth and one normalisation remain its fitted galactic-scale parameters, and we identify the derivation of the dressing—the dressed exponent and its $\\sim 300$ kpc transition radius—as the framework's most important open calculation. The dressing itself survives a pre-registered robustness test: cold gas at measured amplitudes and a generous faint-satellite term close less than one fifth of the two-zone improvement, and a joint fit sets the satellite fraction to zero. Calibrated in physical units, the model predicts $M(<100\\text{ kpc}) = 7.6 \\times 10^{11}\\,M_\\odot$ for an isolated Milky-Way-stellar-mass galaxy, within 10–30% of Gaia-era Milky Way measurements; its distinctive rising outer circular-velocity profile is directly testable with stacked satellite kinematics around isolated analogues.

---

**Part I — Theoretical Framework**

---

## 1. Introduction

The arrow of time remains one of the deepest unresolved problems in physics. The Second Law of Thermodynamics states that entropy increases with time, but does not explain why time has a direction, why the past is fixed, or why the future appears open. General relativity describes time dilation as a consequence of spacetime geometry but offers no thermodynamic explanation for *why* clocks slow in gravitational wells or at high velocities. Meanwhile, dark matter—invoked to explain galactic rotation curves, gravitational lensing, and large-scale structure—has resisted direct detection for decades despite extensive experimental programmes [15, 16].

This work proposes that these apparently separate problems share a common origin. Time is not a fundamental dimension but an emergent process defined by irreversible observation. Its local rate is governed by the thermodynamic cost of committing information to record. Mass is the informational complexity that determines that cost. Gravity is the spatial gradient of observation cost. And dark matter is the gravitational signature of informational complexity without baryonic substrate.

The framework connects to several established research programmes: Landauer's principle [1] provides the quantitative bridge between information and thermodynamics; the holographic principle [3, 4] and the Bekenstein bound [2] relate entropy to geometry; Verlinde's entropic gravity [5] derives gravitational dynamics from information displacement; and the "it from bit" tradition [6] proposes that physical reality is fundamentally informational. Our contribution is to provide a specific, quantitative mechanism that unifies these threads and generates testable predictions.

**Structure of this paper.** We have organised the paper into four parts to keep the empirical and speculative content clearly separated:

- **Part I (Theoretical Framework, Sections 2–8)** develops the framework's definitions and derives its central predictions: time as observation-cost-limited entropy conversion, mass as informational complexity, gravity as statistical bias in possibility space, and dark matter as informational complexity without baryonic substrate.
- **Part II (Empirical Tests, Sections 9–14)** tests the framework's quantitative predictions against the NFW dark matter halo profile, the SPARC galaxy database, KiDS-1000 weak lensing, and the Bullet Cluster. We conclude with a transparent accounting of which quantities in the framework are derived from theory and which are fit to data.
- **Part III (Conceptual Extensions, Sections 15–19)** explores broader implications of the framework—spacetime decomposition, the speed of light as a thermodynamic limit, quantum foundations, and cosmological structure—marked as speculative because they have not yet been quantitatively tested.
- **Part IV (Discussion, Sections 20–22)** consolidates testable predictions, discusses limitations, and concludes.

A reader interested only in the empirical case for the framework may skip directly to Part II after reading the formal definitions in Section 3.

## 2. Dual Entropy Framework

We distinguish two forms of entropy:

**Informational entropy** $S_{\\text{info}}$: entropy associated with unrealised and unobserved physical possibilities. This characterises the openness of the future—the branching space of outcomes not yet committed to record.

**Thermodynamic entropy** $S_{\\text{therm}}$: entropy associated with irreversible physical records embedded in matter, radiation, and fields. This characterises the fixedness of the past.

The total entropy budget of the universe is partitioned between these two forms. Temporal evolution is the process by which $S_{\\text{info}}$ is converted into $S_{\\text{therm}}$ through irreversible observation.

## 3. Formal Definition of Informational Entropy

We define informational entropy using the standard apparatus of quantum information theory. Consider a spatial region $\\mathcal{R}$ embedded in a quantum field-theoretic state $|\\Psi\\rangle$ on a Cauchy surface $\\Sigma$. The full density matrix is $\\hat{\\rho} = |\\Psi\\rangle\\langle\\Psi|$. The reduced density matrix for $\\mathcal{R}$ is obtained by tracing over its complement $\\bar{\\mathcal{R}}$:

$$\\hat{\\rho}_{\\mathcal{R}} = \\text{Tr}_{\\bar{\\mathcal{R}}}(|\\Psi\\rangle\\langle\\Psi|)$$

The informational entropy of region $\\mathcal{R}$ is the von Neumann entropy of this reduced density matrix:

$$S_{\\text{info}}(\\mathcal{R}) = -\\text{Tr}\\!\\left(\\hat{\\rho}_{\\mathcal{R}} \\ln \\hat{\\rho}_{\\mathcal{R}}\\right)$$

This is precisely the entanglement entropy of $\\mathcal{R}$ with its complement. It quantifies the amount of information about the total state that is inaccessible from within $\\mathcal{R}$—the unresolved possibilities.

### 3.1 Mutual Information and Correlations

The correlations between two disjoint regions $A$ and $B$ are quantified by the mutual information:

$$I(A:B) = S_{\\text{info}}(A) + S_{\\text{info}}(B) - S_{\\text{info}}(A \\cup B)$$

In quantum field theory, for regions separated by distance $d$ in the vacuum state, the mutual information decays as [19, 18]:

$$I(A:B) \\sim \\frac{1}{d^{2\\Delta}}$$

where $\\Delta$ is the scaling dimension of the lowest-dimension operator coupling the two regions. For a free scalar field in $3+1$ dimensions, $\\Delta = 1$, giving $I \\sim 1/d^2$.

### 3.2 Observation as Entropy Conversion

Observation is defined physically: any irreversible interaction that records information in the environment. By Landauer's principle [1], each bit of irreversible recording incurs a minimum thermodynamic cost:

$$E_{\\text{bit}} \\geq k_B T \\ln 2$$

When an observation occurs, a portion of $S_{\\text{info}}$ is converted into $S_{\\text{therm}}$: the reduced density matrix partially decoheres, entanglement between $\\mathcal{R}$ and $\\bar{\\mathcal{R}}$ is transferred to classical correlations, and irreversible records are created. The total entropy budget satisfies:

$$\\frac{dS_{\\text{info}}}{dt} = -\\Gamma(t), \\qquad \\frac{dS_{\\text{therm}}}{dt} \\geq \\Gamma(t) \\cdot k_B \\ln 2$$

where $\\Gamma(t)$ is the observation rate (bits per unit time) and the inequality reflects the Landauer bound.

### 3.3 Informational Complexity Density

We define the *informational complexity density* at a point $\\mathbf{x}$ as the integrated mutual information between $\\mathbf{x}$ and all other degrees of freedom:

$$\\rho_{\\text{info}}(\\mathbf{x}) = \\int \\rho_{b,\\text{coh}}(\\mathbf{x}') \\, C\\!\\left(|\\mathbf{x} - \\mathbf{x}'|\\right) d^3\\mathbf{x}'$$

where the correlation kernel

$$C(d) = \\frac{\\alpha}{(d^2 + \\epsilon^2)^{n/2}}$$

encodes the decay of mutual information with distance, $n = 2\\Delta$, $\\epsilon$ is a UV softening scale, and $\\alpha$ is a coupling constant. The source density $\\rho_{b,\\text{coh}}$ is the coherently correlated baryonic density, defined in Section 3.4 below.

### 3.4 Coherent Baryonic Source and the Coherence Fraction

The kernel $C(d)$ is sensitive to internal quantum correlations between baryons within the source region—the structured entanglement that has not yet been transferred to the broader thermal environment. The total von Neumann entropy of a region, by contrast, includes correlations with the environment that have been smeared into the thermal bath. These two quantities differ substantially for systems in thermalised non-equilibrium states.

Formally, the von Neumann entropy of a region decomposes as:

$$S_{\\text{total}} = S_{\\text{internal}} + S_{\\text{environmental}} + S_{\\text{correlation}}$$

where $S_{\\text{internal}}$ measures correlations between baryons within the region, $S_{\\text{environmental}}$ measures correlations transferred to the external thermal bath, and $S_{\\text{correlation}}$ measures residual mixed terms. The kernel, derived from quantum-field-theoretic mutual information decay, is sensitive to $S_{\\text{internal}}$.

We therefore define the coherent baryonic source density as:

$$\\rho_{b,\\text{coh}}(\\mathbf{x}) = \\rho_b(\\mathbf{x}) \\cdot \\eta(\\mathbf{x})$$

where $\\rho_b$ is the total baryonic mass density and $\\eta(\\mathbf{x}) \\in [0, 1]$ is the local coherence fraction: the fraction of a system's bulk gravitational configuration information that remains unresolved—not yet committed to irreversible record.

**The record-writing criterion, derived from Landauer's principle.** In this framework, observation is irreversible recording (Section 2), and by Landauer's principle each committed bit must dump $k_B \\ln 2$ of entropy into an external reservoir. Combining the two yields a theorem: the now-horizon can advance through a region if and only if that region can export entropy to a colder external sink. The coherence fraction is therefore governed not by temperature but by whether a system is actively writing irreversible records of its bulk gravitational configuration into such a sink. Three consequences follow:

- **Trapped equilibrium matter:** $\\eta = 1$ exactly (derived). Optically thick matter in thermal equilibrium with its radiation field has no colder reservoir, and detailed balance cancels every microscopic erasure with its reverse. No net irreversible commitment occurs; the bulk configuration remains unresolved. This applies to the pre-recombination universe, with direct cosmological consequences (Section 19).
- **Conservative or quiescent systems:** $\\eta \\approx 1$. Stars radiate copiously, but the escaping photons carry surface thermal entropy, not bulk-configuration information; their gravitationally bound mass distribution evolves conservatively. Cold disk gas is transparent but quiescent. In both cases bulk-configuration erasure is negligible.
- **Sink-coupled irreversible restructuring:** $\\eta < 1$. A system that is optically thin, embedded in a colder background, and undergoing violent irreversible reconfiguration (e.g. a merger shock) writes records of its configuration into the escaping radiation field. Its unresolved fraction decreases.

This criterion replaces an earlier temperature-based assignment that proved internally inconsistent: temperature conflates surface thermal activity with bulk-configuration erasure, and incorrectly assigns low coherence to the uniformly hot but radiation-trapped early universe.

**Status of $\\eta$: limits derived, intermediate values not.** The limiting values ($\\eta = 1$ for trapped equilibrium and conservative systems; $\\eta \\to 0$ for complete sink-coupled erasure) and the controlling variable (the erasure rate of bulk gravitational configuration information) follow from Landauer's principle and the framework's definitions. The quantitative function for partially resolved systems does not yet follow: a fully constrained accounting for the Bullet Cluster's shocked gas—radiated energy divided by the Landauer cost per bit, against the gas's total entropy—yields $\\eta \\approx 0.9999$, far from the $\\eta \\lesssim 0.2$ required by the lensing data (Section 13). Intermediate $\\eta$ values therefore remain phenomenological, and we flag this honestly wherever they are used.

**Galactic-scale consistency.** At galactic scales, baryons are dominated by cold stars and equilibrium-phase gas, all with $\\eta \\approx 1$ on the record-writing criterion. The KiDS-1000 calibration of $\\alpha$ (Section 11) used stellar mass bins, so the galactic-scale results are unchanged by this refinement.

## 4. The Now-Horizon

The present moment ("now") is defined as a horizon in possibility space where unobserved possibilities become irreversible records. This boundary has properties analogous to an event horizon: irreversibility, one-way information flow, entropy generation, and separation of accessible and inaccessible states.

The now-horizon separates the *future* (unobserved, high $S_{\\text{info}}$) from the *past* (observed, fixed, $S_{\\text{info}} = 0$). Temporal flow is the propagation of this horizon through possibility space.

### 4.1 Efficiency and the Topology of Collapse

Not all branches of the possibility space cost the same to collapse. In Shannon entropy, high-probability events carry less information and therefore require less thermodynamic entropy production per observation event. The Landauer cost of committing branch $i$ is:

$$E_i = -k_B T \\ln 2 \\cdot \\log_2 p_i = k_B T \\ln(1/p_i)$$

where $p_i$ is the branch probability.

High-probability branches are thermodynamically *efficient* to collapse—they represent shorter routes through informational space. The now-horizon advances fastest along these paths of least thermodynamic resistance, creating a temporal topology in which some regions of possibility space resolve faster than others. Low-probability branches persist as unresolved informational entropy, connecting naturally to quantum superposition.

## 5. Local Now-Horizons and Relativistic Time Dilation

The now-horizon is *local*: because observation cost depends on local physical conditions, the rate at which $S_{\\text{info}}$ is converted into $S_{\\text{therm}}$ varies across spacetime.

### 5.1 Local Observation Capacity

The local observation capacity—the maximum rate at which the now-horizon can advance—is:

$$\\mathcal{O}_{\\text{local}} = \\frac{\\dot{E}_{\\text{diss}}}{k_B T \\ln 2}$$

where $\\dot{E}_{\\text{diss}}$ is the locally available rate of free-energy dissipation and $T$ is the local temperature. In regions where the Landauer cost per bit is high, fewer bits can be committed per unit of available energy, and the now-horizon advances more slowly.

### 5.2 Gravitational Time Dilation

The Tolman–Ehrenfest relation [10] states that in thermal equilibrium within a static gravitational field:

$$T(r) \\sqrt{g_{00}(r)} = T_\\infty = \\text{const}$$

For the Schwarzschild metric with $g_{00} = 1 - 2GM/rc^2$:

$$T(r) = \\frac{T_\\infty}{\\sqrt{1 - 2GM/rc^2}}$$

Temperature increases deeper in the gravitational well, raising the Landauer cost per bit. Simultaneously, available dissipation energy is gravitationally redshifted. An energy packet $E_\\infty$ emitted at infinity arrives at radius $r$ with energy:

$$E(r) = E_\\infty \\sqrt{g_{00}(r)}$$

(Energy is blueshifted falling into a well, but the relevant quantity is the locally available free energy for dissipation, which for a system in quasi-static equilibrium redshifts as $\\sqrt{g_{00}}$.)

The observation capacity ratio is therefore:

$$\\frac{\\mathcal{O}(r)}{\\mathcal{O}(\\infty)} = \\frac{\\dot{E}_{\\text{diss}}(r) / T(r)}{\\dot{E}_{\\text{diss}}(\\infty) / T_\\infty} = g_{00}$$

Since the rate of temporal evolution is proportional to observation capacity, and the proper time interval $d\\tau$ relates to coordinate time $dt$ through the square root of the metric component:

$$\\frac{d\\tau}{dt} = \\sqrt{\\frac{\\mathcal{O}(r)}{\\mathcal{O}(\\infty)}} = \\sqrt{g_{00}} = \\sqrt{1 - \\frac{2GM}{rc^2}}$$

This recovers the Schwarzschild time dilation factor from observation economics.

### 5.3 Velocity-Based Time Dilation

For a relativistically moving observer, the causal horizon contracts. Fewer regions of possibility space are causally accessible, reducing the informational entropy available for collapse. The observer's interaction cross-section with the ambient thermal environment is relativistically modified, reducing net observation capacity by the Lorentz factor:

$$\\mathcal{O}_{\\text{moving}} = \\frac{\\mathcal{O}_{\\text{rest}}}{\\gamma}$$

This yields:

$$d\\tau = \\frac{dt}{\\gamma} = dt\\sqrt{1 - v^2/c^2}$$

recovering special-relativistic time dilation from observation capacity constraints.

### 5.4 Interpretation

This section does not claim to replace relativity. It proposes that the *thermodynamic reason* time dilates is that observation is more expensive in high-energy-density or high-velocity environments. Relativity describes the geometry; this framework offers a candidate mechanism for why the geometry has the temporal structure it does. If time dilation is a consequence of observation economics, spacetime geometry may itself be emergent from thermodynamic constraints on information processing—consistent with holographic [3, 4] and entropic [5] gravity programmes.

## 6. Mass as Observation Resistance

### 6.1 The Dual Role of Mass

Through $E = mc^2$, mass plays a dual role in this framework:

**Mass as observation fuel.** Energy is the currency that funds the Landauer cost of collapsing $S_{\\text{info}}$ into $S_{\\text{therm}}$. Mass-energy represents the total budget available for irreversible state commitment.

**Mass as observation resistance.** Via the Tolman–Ehrenfest relation, mass raises the local temperature, increasing the Landauer cost per bit. Mass-dense regions have large observation budgets but low efficiency per bit committed.

### 6.2 Mass as Informational Complexity

The deeper claim is that mass may be *emergent* from informational structure. A region with many entangled, high-information-content, unresolved possibilities is expensive to observe. It resists now-horizon advance. It behaves exactly as if it has mass. In this interpretation, mass is a measure of the informational complexity of a region's unresolved possibility space—its observation resistance density.

### 6.3 Gravity as the Observation Cost Gradient

If mass is observation resistance density, then gravity is the spatial gradient of observation cost:

$$\\mathbf{g}(\\mathbf{x}) \\propto -\\nabla \\left[\\frac{k_B T(\\mathbf{x}) \\ln 2}{\\dot{E}_{\\text{diss}}(\\mathbf{x})}\\right]$$

Objects follow trajectories that minimise the integrated observation cost—the geodesic equation reinterpreted as a statement about informational economics. This is structurally equivalent to Verlinde's entropic gravity [5] but derived from a different starting point.

### 6.4 The Bekenstein Bound as an Accounting Identity

The Bekenstein bound [2] states:

$$S \\leq \\frac{2\\pi k_B R E}{\\hbar c}$$

In this framework, the bound acquires a natural interpretation: a region cannot contain more unresolved informational entropy ($S_{\\text{info}}$) than its mass-energy budget ($E$) can eventually collapse at the minimum Landauer cost. The bound is an accounting identity: informational debt cannot exceed the observation budget.

## 7. Gravity as Statistical Bias in Possibility Space

The observation-cost gradient formulation of gravity (Section 6) is mathematically precise but obscures a deeper insight: gravity is not a force, a geometric distortion, or even a cost gradient. It is a *statistical bias in the branching structure of informational entropy*.

### 7.1 The Probability-Weighted Branch Structure

Consider an object near a massive body. Its future possibility space branches in all directions—it could, in principle, move any way. But these branches are not equally weighted. The informational complexity density surrounding the mass (Section 3) creates an asymmetric probability distribution over future branches.

Branches in which the object moves *toward* the mass are overwhelmingly more probable than branches in which it moves away. This is because the region near the mass has higher informational complexity: more correlated degrees of freedom, more entangled quantum states, more interaction pathways through which the object can decohere and become correlated with its environment. Moving toward the mass means moving into a denser web of correlations—more possible interactions, more possible decoherence pathways, more ways for the quantum state to evolve. Moving away means moving into sparser informational territory.

From Section 4, the now-horizon preferentially collapses high-probability branches because they are thermodynamically cheapest: lower information content per branch, lower Landauer cost per observation event. The universe does not "choose" the gravitational trajectory. The gravitational trajectory is simply the cheapest branch to collapse, so it is resolved first.

### 7.2 Reconciling Efficiency and Gravitation

There is an apparent tension in the framework that must be resolved. Section 4 states that the now-horizon advances fastest along high-probability, low-cost branches—the efficiency principle. Yet gravity pulls objects *toward* high-informational-complexity regions, where the Landauer cost per bit is *higher* and the now-horizon advances more slowly. If the universe favours cheap branches, why does it steer matter toward expensive regions?

The resolution is that these operate at different scales. Individual branch collapses follow the efficiency gradient: each single observation event preferentially resolves the cheapest available possibility. But the *bulk trajectory* of an object through space follows the **maximum entropy production** gradient: it moves toward regions where the *total* rate of thermodynamic entropy generation is highest.

A region of high informational complexity is expensive per bit but offers an enormous *density* of collapsible branches—more correlated degrees of freedom, more decoherence pathways, more opportunities for irreversible recording. Although each individual collapse costs more Landauer energy, there are far more collapses available per unit volume. The total entropy production rate along paths toward the mass exceeds the rate along paths away from it.

This is analogous to fluid flow. Water does not flow toward the location where each molecule moves most freely. It flows downhill—toward the configuration that maximises the total conversion of gravitational potential energy into thermal energy. Individual molecules undergo random thermal motion, but the bulk flow follows the maximum dissipation gradient. The now-horizon behaves identically: individual branch collapses follow the efficiency gradient (cheapest first), but the aggregate flow of the now-horizon follows the maximum entropy production gradient—which is gravity.

*Gravity is the path of maximum total entropy production through the informational landscape.*

### 7.3 The Mass–Observation Feedback Loop

The relationship between informational complexity and mass creates a self-reinforcing feedback loop with significant physical consequences.

As the now-horizon pushes into an informationally dense region and collapses possibilities, it generates thermodynamic entropy. Each collapse event has a Landauer cost of at least $k_B T \\ln 2$ per bit, and this cost is paid in dissipated energy. That dissipated energy *is* mass-energy (via $E = mc^2$). The thermodynamic entropy produced by observation contributes to the local energy density, which raises the local temperature via the Tolman–Ehrenfest relation, which increases the Landauer cost of future observations, which further slows the now-horizon.

The cycle is:

$$\\text{High } S_{\\text{info}} \\xrightarrow{\\text{collapse}} \\text{High } S_{\\text{therm}} \\xrightarrow{\\text{Landauer}} \\text{High } E \\xrightarrow{E=mc^2} \\text{High } m \\xrightarrow{\\text{Tolman}} \\text{High } T \\xrightarrow{\\text{cost}} \\text{Slow now-horizon}$$

This feedback loop may provide an informational mechanism for gravitational collapse. Matter clumps not merely because geometry curves, but because observation in informationally dense regions generates mass-energy that makes those regions more informationally dense. The process is self-amplifying: mass generates more mass through the thermodynamic cost of resolving its own informational complexity.

The feedback loop also suggests a natural explanation for structure formation in the early universe. Regions with slightly higher initial informational complexity would collapse possibilities slightly faster, generating slightly more thermodynamic entropy, producing slightly more effective mass, attracting more matter, increasing the informational complexity further. Small initial asymmetries in the informational landscape would be amplified into large-scale structure—galaxies, clusters, and filaments—through this self-reinforcing mechanism.

### 7.4 Black Holes as Informational Saturation

The mass–observation feedback loop runs to completion in a black hole. As informational complexity increases without bound, the Landauer cost per bit diverges, and the now-horizon asymptotically halts.

At the event horizon, the feedback loop reaches a critical threshold: the informational density is so high, and the Landauer cost so extreme, that no finite energy budget can collapse even a single additional bit. The now-horizon freezes. This is why time stops at the event horizon—not because of infinite spacetime curvature in the geometric sense, but because the observation cost per bit has diverged.

The singularity, in this interpretation, is the point of infinite informational complexity: an infinite density of unresolved possibilities that no amount of energy can ever collapse. The Bekenstein–Hawking entropy of a black hole,

$$S_{\\text{BH}} = \\frac{k_B c^3 A}{4 G \\hbar}$$

represents the total informational entropy trapped behind the horizon—possibilities that have been permanently removed from the observable universe's collapse budget without being resolved.

Hawking radiation acquires a natural interpretation: it is the slow leakage of informational complexity back across the horizon, driven by quantum fluctuations that occasionally push bits across the observation-cost barrier. The black hole information paradox becomes a question about whether the specific *structure* of the trapped informational entropy (which particular possibilities were frozen) is preserved in the radiation, or whether only the total *count* survives.

### 7.5 Orbits as Observation-Efficient Trajectories

In general relativity, orbits are geodesics—paths that extremise proper time. Since proper time in this framework is the accumulated observation along a worldline (the number of bits of $S_{\\text{info}}$ collapsed by the local now-horizon), a geodesic is the trajectory that maximises total observation for a given energy budget.

A circular orbit represents the equilibrium between two competing observation costs:

**Gravitational observation cost.** Deeper in the well, the Tolman–Ehrenfest relation raises the local temperature and the Landauer cost per bit. Falling inward means entering a regime of more expensive observation.

**Kinetic observation cost.** Higher velocity contracts the causal horizon and reduces observation capacity. Speeding up makes observation more expensive.

A radial plunge compounds both costs—the object is deep in the well *and* moving fast, and its now-horizon crawls. A circular orbit balances the two: the gravitational cost gradient pulling inward is exactly compensated by the velocity-dependent cost resisting further acceleration. The planet's now-horizon advances at a steady, optimised rate.

Elliptical orbits are oscillations around this equilibrium. At periapsis, both costs are high and the now-horizon advances slowly; at apoapsis, both costs are low and the now-horizon advances faster. Conservation of energy along the orbit is the conservation of the total observation budget: gravitational cost plus kinetic cost remains constant. Conservation of angular momentum is the preservation of the rotational correlation structure in possibility space—a pattern of entangled possibilities that persists unless disrupted by an external observation event.

### 7.6 Galaxy Rotation Curves

In standard gravity with only baryonic matter, orbital velocity should fall as $v \\propto 1/\\sqrt{r}$ beyond the visible disc. Observed rotation curves are flat to large radii. In this framework, stars in the outer galaxy are not orbiting the visible mass alone. They are following the probability-weighted branch structure of the full informational complexity landscape, which includes the quantum correlations propagating outward from the galactic core:

$$\\frac{v^2}{r} = \\frac{G\\left[M_{\\text{baryonic}}(r) + M_{\\text{info}}(r)\\right]}{r^2}$$

where $M_{\\text{info}}(r)$ is the effective mass enclosed within radius $r$ from the informational complexity profile $\\rho_{\\text{info}}(r)$. Since the NFW-like informational complexity profile falls off more slowly than the baryonic profile, the enclosed effective mass continues to grow with radius, keeping $v$ approximately constant.

### 7.7 Universality of Gravity

This formulation resolves a foundational puzzle: *why is gravity universal?* Why does it affect all matter equally, regardless of composition?

In Newtonian mechanics, this is a brute empirical fact (equivalence of inertial and gravitational mass). In general relativity, it is elevated to the equivalence principle, which is axiomatic. In this framework, it is a *consequence*: gravity is not a force coupling to a specific property of matter through a charge or quantum number. It is the statistical structure of possibility space itself. Every physical system has a branching future; every branching future has a probability distribution; that distribution is shaped by the informational complexity landscape. Universality follows because nothing can opt out of the probability distribution over its own future branches.

This also clarifies why freefall is locally indistinguishable from inertial motion—the weak equivalence principle. An object in freefall is not being acted on by any force. It is following the maximum-probability path through its own possibility space. There is nothing to feel, because there is no deviation from the statistically preferred trajectory.

### 7.8 Newton's Laws as Informational Statements

Newton's three laws acquire natural informational restatements:

**First Law** (inertia): In the absence of an informational complexity gradient, all directional branches are equally weighted. There is no preferred cheap path, and the existing trajectory—the already-committed correlation structure—persists.

**Second Law** ($F = ma$): The rate of change of branch selection is proportional to the observation-cost gradient. Mass $m$ is the informational complexity that resists changes in branch trajectory; force $F$ is the gradient of the informational complexity landscape; acceleration $a$ is the resulting shift in the probability distribution over future branches.

**Third Law** (action–reaction): When two systems interact, each modifies the other's informational complexity landscape symmetrically. The observation-cost gradient imposed by $A$ on $B$ equals the gradient imposed by $B$ on $A$, because mutual information is symmetric: $I(A:B) = I(B:A)$.

## 8. Dark Matter as Informational Complexity

If mass is the informational complexity of a region's unresolved possibility space, then gravitational effects do not require baryonic matter—they require informationally complex regions where the now-horizon is expensive to advance.

### 8.1 The Proposal

Dark matter, in this framework, is not a particle. It is the gravitational signature of regions where the informational possibility structure is dense and entangled—where complex branching structures create observation-cost gradients—without that complexity being expressed as visible baryonic matter.

This resolves the two deepest puzzles simultaneously: dark matter does not interact electromagnetically because it is informational structure rather than material substance (there is no particle to scatter photons), and direct detection experiments fail because there is no particle to detect.

### 8.2 Informational Complexity Profile

The informational complexity density at radius $r$ from a galaxy with baryonic profile $\\rho_b$ is:

$$\\rho_{\\text{info}}(r) = \\alpha \\int \\rho_b(\\mathbf{r}') \\, C(|\\mathbf{r} - \\mathbf{r}'|) \\, d^3\\mathbf{r}'$$

For a spherically symmetric baryonic distribution, this reduces to:

$$\\rho_{\\text{info}}(r) = \\alpha \\int_0^\\infty \\rho_b(r') \\, K_n(r, r') \\, 4\\pi r'^2 \\, dr'$$

where $K_n(r, r')$ is the angular average of the correlation kernel:

$$K_n(r, r') = 2\\pi \\int_0^\\pi \\frac{\\sin\\theta}{(r^2 + r'^2 - 2rr'\\cos\\theta + \\epsilon^2)^{n/2}} \\, d\\theta$$

The prediction is that $\\rho_{\\text{info}}(r)$ should match the observed NFW dark matter halo profile [7]:

$$\\rho_{\\text{NFW}}(r) = \\frac{\\rho_0}{(r/R_s)(1 + r/R_s)^2}$$

We test this quantitatively in Section 9.

### 8.3 Distribution and Halo Structure

Dark matter halos concentrate around galaxies and large-scale structure—exactly where this framework predicts the highest informational complexity. Galaxies are regions of intense causal entanglement: billions of stars, feedback loops, magnetic fields, and gravitational interactions create a dense web of correlated possibilities. The halo is the informational shadow of this complexity extending beyond the visible matter.

The framework also makes specific predictions for non-equilibrium baryonic systems, particularly merging galaxy clusters such as the Bullet Cluster, where the coherence fraction of Section 3.4 plays a critical role. We test this in detail in Section 13.

---

**Part II — Empirical Tests**

---

The framework's central observable prediction is that informational complexity, sourced by coherent baryonic matter and propagated through the QFT correlation kernel, should gravitate identically to mass. The following sections test this prediction against four independent datasets spanning kiloparsec to megaparsec scales: the NFW dark matter halo profile, the SPARC galaxy rotation curve database, KiDS-1000 weak gravitational lensing, and the Bullet Cluster.

We close this part with a transparent accounting of which quantities in the framework are derived from theoretical principles, which are fit to data, and which are chosen by convention (Section 14).

## 9. The NFW Profile from Hernquist Convolution

We test the framework's central prediction numerically for a Milky Way-like galaxy. The baryonic matter is modelled with a Hernquist profile [8]:

$$\\rho_b(r) = \\frac{M_b \\, a_b}{2\\pi \\, r \\, (r + a_b)^3}$$

with total mass $M_b = 5 \\times 10^{10} \\, M_\\odot$ and scale radius $a_b = 3$ kpc. This is dominated by stellar baryons in dynamical equilibrium, so $\\eta \\approx 1$ throughout (Section 3.4) and $\\rho_{b,\\text{coh}} \\approx \\rho_b$.

We compute $\\rho_{\\text{info}}(r)$ by numerical quadrature over the spherical convolution, using a UV softening length $\\epsilon = 0.05$ kpc, and scan over the kernel power-law index $n$.

The key result (Table 1) is that kernels in the neighbourhood of the free scalar field value reproduce the NFW profile shape with $R^2 \\approx 0.99$. A fine scan (Section 12.4) shows the $R^2$ surface is flat at the $0.005$ level across $n \\in [1.50, 2.60]$: the table's nominal optimum ($n = 2.18$) sits on this plateau and should not be read as a measurement of $n$. The NFW shape is fully consistent with the parameter-free prediction $\\Delta = 1$ ($n = 2$) but cannot discriminate the exponent at better than $\\pm 0.5$; the discriminating measurement comes from the KiDS outer-region fits (Section 12.4).

A caveat on the scale radius: at $n = 2.0$ the fitted $R_s$ is 41–54 kpc across the baryonic profiles we tested, above the 15–25 kpc obtained when NFW is fitted to Milky Way data. This comparison is, however, posed within an idealised single-$n$, spherical setup; under the empirically preferred two-zone (dressed-plus-bare) kernel the predicted profile is no longer NFW-like at these radii, and the meaningful confrontation with Milky Way data moves to calibrated enclosed-mass space, where the headline comparison agrees at the 10–30% level and two bounded residuals remain (Section 12.6).

| Kernel | $R^2$ (NFW fit) | $R_s$ (kpc) | $\\Delta$ |
|--------|-----------------|-------------|----------|
| $n = 1.0$ | 0.814 | — | 0.50 |
| $n = 1.5$ | 0.988 | 262.6 | 0.75 |
| $n = 2.0$ | 0.992 | 37.6 | 1.00 |
| $n = 2.18$ | 0.993 | 20.8 | 1.09 |
| $n = 2.5$ | 0.995 | 7.8 | 1.25 |
| $n = 3.0$ | 0.990 | 1.7 | 1.50 |

*Table 1: NFW fit results for different correlation kernel power laws. $R^2$ is computed in log-space. The $R^2$ surface is flat across $n \\in [1.5, 2.6]$ (see text); the nominal optimum at $n = 2.18$ sits on this plateau and is not a measurement of $n$.*

**Status of this result.** The NFW reproduction is a successful retrodiction of a known halo profile shape, and—given the flatness of the $R^2$ plateau—a weak constraint on the exponent. It is necessary but not sufficient evidence for the framework: several other functional forms could likely fit NFW with comparable quality. The framework's distinguishing claims are quantitative and live elsewhere: the derived $\\alpha$–$M$ exponent (Section 10) and the parameter-free bare kernel tested against the KiDS outer regions (Section 12.4).

## 10. Steady-State Coupling: Deriving α from the Feedback Loop

The NFW calculation (Section 9) introduces a coupling constant $\\alpha$ relating baryonic density to informational complexity density. If $\\alpha$ were a free parameter for each galaxy, the framework would have limited predictive power. We now show that the mass–observation feedback loop (Section 7.3) determines $\\alpha$ from galaxy structure, reducing the framework to a single free parameter.

### 10.1 Steady-State Equation

The informational complexity density at radius $r$ from a galaxy evolves through two competing processes:

$$\\frac{\\partial \\rho_{\\text{info}}}{\\partial t} = \\mathcal{G}(r) - \\mathcal{D}(r)$$

The *generation rate* $\\mathcal{G}(r)$ arises from quantum correlations propagating outward from baryonic matter:

$$\\mathcal{G}(r) = \\gamma \\int \\rho_{b,\\text{coh}}(\\mathbf{r}') \\, C(|\\mathbf{r} - \\mathbf{r}'|) \\, d^3\\mathbf{r}'$$

where $\\gamma$ is the intrinsic correlation generation rate per unit coherent baryonic mass.

The *destruction rate* $\\mathcal{D}(r)$ is the rate at which observation collapses informational complexity. This is proportional to both the existing complexity (more complexity means more to collapse) and the local observation capacity, which depends on the available energy flux:

$$\\mathcal{D}(r) = \\rho_{\\text{info}}(r) \\cdot \\frac{\\xi \\, F(r)}{k_B T \\ln 2}$$

where $F(r) = L / (4\\pi r^2)$ is the radiative energy flux from a galaxy of luminosity $L$, and $\\xi$ is an observation efficiency factor.

### 10.2 Steady-State Solution

At equilibrium ($\\partial \\rho_{\\text{info}} / \\partial t = 0$):

$$\\rho_{\\text{info}}(r) = \\frac{\\gamma \\, k_B T \\ln 2}{\\xi \\, F(r)} \\int \\rho_{b,\\text{coh}}(\\mathbf{r}') \\, C(|\\mathbf{r} - \\mathbf{r}'|) \\, d^3\\mathbf{r}'$$

Comparing with the informational complexity profile equation, the effective coupling constant is:

$$\\alpha_{\\text{eff}} = \\frac{\\gamma \\, k_B T \\ln 2}{\\xi \\, F(R_{\\text{char}})}$$

evaluated at a characteristic halo radius $R_{\\text{char}}$.

Since $F \\propto L / R_{\\text{char}}^2$ and $L \\propto M_{\\text{bar}}$ (at fixed mass-to-light ratio):

$$\\alpha_{\\text{eff}} \\propto \\frac{R_{\\text{char}}^2}{M_{\\text{bar}}}$$

### 10.3 Predicted Scaling Exponent

If the characteristic halo size scales with baryonic mass as $R_{\\text{char}} \\propto M_{\\text{bar}}^\\delta$, then:

$$\\alpha_{\\text{eff}} \\propto M_{\\text{bar}}^{2\\delta - 1}$$

This is a testable prediction: the exponent of the $\\alpha$–$M$ relation is determined by the galaxy size–mass relation.

### 10.4 Test Against SPARC Data

We test this prediction using the SPARC database [21] of 175 disk galaxies with Spitzer photometry and high-quality rotation curves. For each galaxy, the SPARC data provide the observed rotation curve, decomposed baryonic contributions (disk, gas, and bulge), and surface brightness profiles.

**Step 1: Size–mass relation.** From the SPARC photometry, we measure the half-light radius $R_{1/2}$ for each galaxy and fit the scaling relation. The result is:

$$R_{1/2} \\propto M_{\\text{bar}}^{0.255 \\pm 0.016} \\qquad (r = 0.78, \\; p = 1.2 \\times 10^{-35})$$

**Step 2: Predicted exponent.** With $\\delta = 0.255$:

$$\\alpha_{\\text{eff}} \\propto M_{\\text{bar}}^{2(0.255) - 1} = M_{\\text{bar}}^{-0.491}$$

**Step 3: Measured exponent.** We fit the informational complexity model to each SPARC galaxy's rotation curve individually, optimising $\\alpha$ per galaxy at fixed kernel power $n$. The resulting $\\alpha$ values correlate strongly with baryonic mass:

$$\\alpha_{\\text{measured}} \\propto M_{\\text{bar}}^{-0.594 \\pm 0.052} \\qquad (r = -0.68, \\; p = 3.6 \\times 10^{-22})$$

**Result:** The predicted exponent ($-0.491$) agrees with the measured exponent ($-0.594 \\pm 0.052$) to within $2.0\\sigma$. The steady-state feedback equation, combined with the observed galaxy size–mass relation, predicts the mass-dependent coupling constant without fitting.

### 10.5 Physical Interpretation

The scaling $\\alpha_{\\text{eff}} \\propto R^2 / M$ has a direct physical interpretation: more massive galaxies have higher observation capacity per unit solid angle, destroying informational complexity faster and leaving less in the halo per unit baryonic mass. The surviving fraction—which manifests as the dark matter effect—is governed by the balance between quantum correlation generation and observational destruction.

The residual $\\sim 20\\%$ discrepancy between the predicted and measured exponents ($-0.491$ vs. $-0.594$) suggests that the destruction rate scales slightly steeper with mass than simple $L/R^2$. This could reflect enhanced observational efficiency in more massive galaxies due to higher stellar densities and more correlated decoherence events per unit luminosity—a correction of the form $\\mathcal{D} \\propto M_{\\text{bar}}^{1+\\epsilon} / R^2$ with $\\epsilon \\approx 0.05$ would close the gap.

### 10.6 Parameter Count

With $\\alpha$ determined by the scaling relation, the framework has a single truly free parameter: the kernel power-law index $n$ (or equivalently the scaling dimension $\\Delta = n/2$). This is comparable to MOND, which has one free parameter ($a_0 = 1.2 \\times 10^{-10}$ m/s²), and fewer free parameters per galaxy than standard NFW dark matter models (which require two halo parameters per galaxy, constrained by the concentration–mass relation).

## 11. Weak Gravitational Lensing Test with KiDS-1000

Galaxy rotation curves probe the gravitational field within the disk plane. A fundamentally different test is provided by weak gravitational lensing, which measures the total projected mass distribution along the line of sight through the coherent distortion of background galaxy shapes. We test the informational complexity model against the stacked excess surface density (ESD) profiles measured by Brouwer et al. [22] using 1006 deg² of KiDS-1000 weak lensing data [21].

### 11.1 Data and Method

Brouwer et al. [22] measured the ESD profile $\\Delta\\Sigma(R)$ around isolated galaxies from the KiDS-1000 survey, stacked in four bins of stellar mass spanning $8.5 < \\log(M_\\star/M_\\odot) < 11.0$. Each bin contains thousands of lens galaxies, producing high signal-to-noise stacked profiles from $\\sim 30$ kpc to $\\sim 3$ Mpc in projected radius.

For each stellar mass bin, we compute the predicted ESD from the informational complexity model as follows:

1. Assign each bin a mean stellar mass $M_\\star$ and exponential disk scale radius $R_d$ from the size–mass relation (Section 10.4).
2. Compute the 3D informational complexity density $\\rho_{\\text{info}}(r)$ by convolving the baryonic density with the correlation kernel.
3. Project $\\rho_{\\text{info}}(r)$ along the line of sight to obtain the surface density $\\Sigma(R)$.
4. Compute $\\Delta\\Sigma(R) = \\bar{\\Sigma}(<R) - \\Sigma(R)$.
5. Add the baryonic contribution from the exponential disk.

The coupling constant $\\alpha$ is predicted per mass bin from the steady-state scaling relation with $\\alpha = \\alpha_0 (M_\\star / M_0)^{-0.491}$, leaving two global parameters: the kernel power law $n$ and the normalisation $\\alpha_0$.

### 11.2 Results: Informational Complexity vs. NFW

We compare the informational complexity model to standard NFW dark matter halo fits, which have two free parameters per mass bin (halo mass $M_{200}$ and concentration $c$, totalling 8 parameters across 4 bins).

| Bin | $\\log M_\\star$ | $\\chi^2_r$ (Info) | $n$ | $\\chi^2_r$ (NFW) | $\\log M_{200}$ | Winner |
|-----|---------------|----------------|------|----------------|----------------|--------|
| 1 | 9.40  | **2.14** | 1.75 | 3.48  | 11.75 | Info |
| 2 | 10.45 | **6.24** | 1.75 | 6.30  | 12.25 | Info |
| 3 | 10.70 | **5.78** | 1.75 | 10.58 | 12.25 | Info |
| 4 | 10.90 | **8.45** | 1.75 | 15.36 | 12.25 | Info |
| **Total** | | **5.65** | | **8.93** | | |

*Table 2: Comparison of informational complexity and NFW dark matter fits to KiDS-1000 stacked ESD profiles from Brouwer et al. [22]. The informational complexity model uses 2 global parameters ($n$, $\\alpha_0$); NFW uses 2 parameters per bin (8 total). Informational complexity achieves lower $\\chi^2_r$ in all four mass bins.*

The informational complexity model outperforms NFW in all four stellar mass bins (Table 2), with a total reduced $\\chi^2$ of 5.65 versus 8.93 for NFW, using 2 global parameters versus 8. The preferred kernel power law is $n = 1.75$ ($\\Delta = 0.875$), consistent across all mass bins.

The absolute $\\chi^2_r$ values exceed unity for both models, reflecting known systematics in stacked weak lensing analyses: correlated shape noise between radial bins, imperfect covariance estimation, residual satellite contamination, and miscentring effects [22]. These systematics affect all models equally; the relevant comparison is the relative performance.

### 11.3 Comparison with MOND and Emergent Gravity

Brouwer et al. [22] tested three models against this same dataset: NFW (2 parameters per bin), MOND (1 global parameter $a_0$), and Verlinde's emergent gravity (0 free parameters). They found MOND and emergent gravity both provided reasonable fits. The informational complexity model, with 2 global parameters, outperforms NFW while having comparable parameter count to MOND.

## 12. Scale-Dependent Correlation Kernel

The NFW profile calculation (Section 9) is consistent with kernel exponents near the free scalar field value $n = 2$, while the KiDS-1000 global fit (Section 11) prefers $n = 1.75$ ($\\Delta = 0.875$). This discrepancy must be addressed. We test whether the correlation kernel power law depends on the physical scale being probed.

### 12.1 Prediction and Test

We split the KiDS-1000 ESD profiles at a transition radius $R_{\\text{split}}$ and fit $n$ independently to the inner ($R < R_{\\text{split}}$) and outer ($R \\geq R_{\\text{split}}$) radial ranges. The test is performed at three split radii (200, 300, and 500 kpc) across all four stellar mass bins.

### 12.2 Results

The kernel power law exhibits a clear, consistent scale dependence across all 12 bin–split combinations (Table 3).

| $R_{\\text{split}}$ | Bin | $\\log M_\\star$ | $n_{\\text{inner}}$ | $n_{\\text{outer}}$ | $\\Delta n$ |
|---------------------|-----|-----------------|---------------------|---------------------|-------------|
| 200 kpc | 1 | 9.40  | 1.25 | 1.75 | $-0.50$ |
|         | 2 | 10.45 | 1.25 | 2.25 | $-1.00$ |
|         | 3 | 10.70 | 1.25 | 2.00 | $-0.75$ |
|         | 4 | 10.90 | 1.25 | 2.00 | $-0.75$ |
|         | **Mean** | | **1.25** | **2.00** | **$-0.75$** |
| 300 kpc | 1 | 9.40  | 1.50 | 2.00 | $-0.50$ |
|         | 2 | 10.45 | 1.25 | 2.25 | $-1.00$ |
|         | 3 | 10.70 | 1.25 | 2.00 | $-0.75$ |
|         | 4 | 10.90 | 1.25 | 2.00 | $-0.75$ |
|         | **Mean** | | **1.31** | **2.06** | **$-0.75$** |
| 500 kpc | 1 | 9.40  | 1.75 | 2.25 | $-0.50$ |
|         | 2 | 10.45 | 1.25 | 2.50 | $-1.25$ |
|         | 3 | 10.70 | 1.50 | 2.25 | $-0.75$ |
|         | 4 | 10.90 | 1.50 | 2.50 | $-1.00$ |
|         | **Mean** | | **1.50** | **2.38** | **$-0.88$** |

*Table 3: Scale-dependent kernel power law from split fits to KiDS-1000 ESD profiles. The inner kernel is consistently softer than the outer kernel, with $\\Delta n = n_{\\text{inner}} - n_{\\text{outer}} < 0$ in all 12 combinations. The outer value $n_{\\text{outer}} \\approx 2.0$–$2.5$ converges toward the bare free-scalar-field prediction $n = 2$.*

Three key features emerge:

**1. The kernel runs with scale.** In all 12 bin–split combinations, $n_{\\text{inner}} < n_{\\text{outer}}$. The probability of this occurring by chance is $2^{-12} \\approx 0.02\\%$. The effect is large: $\\Delta n \\approx -0.75$ to $-1.0$, corresponding to a shift in effective scaling dimension of $\\Delta\\Delta \\approx 0.4$–$0.5$.

**2. The outer kernel recovers the bare value.** At $R_{\\text{split}} = 300$ kpc, the mean outer kernel is $n_{\\text{outer}} = 2.06$, in excellent agreement with the free-scalar-field prediction $n = 2$. At $R_{\\text{split}} = 500$ kpc, $n_{\\text{outer}} = 2.38$, bracketing it from above; the joint constraint across all bins is quantified in Section 12.4.

**3. The global fit is a signal-weighted average.** The KiDS-1000 global best-fit $n = 1.75$ falls between the inner ($\\sim 1.25$) and outer ($\\sim 2.0$) values, weighted toward the inner region where the lensing signal-to-noise is highest.

### 12.3 Physical Interpretation: Kernel Dressing in Dense Environments

The scale dependence has a natural interpretation in terms of quantum field theory in a medium. At each scale:

**Inner halo ($R \\lesssim 300$ kpc):** The correlation kernel propagates through a dense baryonic environment. Quantum correlations from each source overlap with those from every other source, reinforcing the correlation field and effectively softening the decay. This is analogous to the dressing of propagators in condensed matter: the bare propagator is modified by the medium, reducing the effective scaling dimension. The result is a "dressed" kernel with $n_{\\text{eff}} \\approx 1.25$–$1.5$.

**Outer halo ($R \\gtrsim 300$ kpc):** Correlations propagate through near-vacuum without reinforcement from dense baryonic matter. The measured kernel approaches the bare QFT value, with $n_{\\text{eff}} \\approx 2.0$–$2.5$.

In the language of renormalisation, the scaling dimension $\\Delta = n/2$ runs from a dressed value $\\Delta_{\\text{dressed}} \\approx 0.63$ in dense environments to the bare value $\\Delta_{\\text{bare}} \\approx 1.0$–$1.1$ in vacuum. The effective running rate is:

$$\\beta_\\Delta = \\frac{\\Delta\\Delta}{\\ln(R_{\\text{outer}} / R_{\\text{inner}})} \\approx \\frac{0.38}{\\ln(1000/100)} \\approx 0.16 \\; \\text{per } \\ln(\\text{scale})$$

This resolves the apparent discrepancy between the theoretical NFW calculation and the observational KiDS-1000 global fit ($n = 1.75$): they probe different scales, and the kernel runs between them. The global fit measured a signal-weighted average of the dressed and bare regimes.

### 12.4 The Bare Kernel as a Parameter-Free Prediction

The convergence of the outer kernel on $n \\approx 2$ invites a stronger reframing, which we adopt and test: the bare kernel is the free scalar field value $\\Delta = 1$ ($n = 2$) exactly—a parameter-free prediction of quantum field theory [19]—and every measured deviation is environmental dressing.

Three recomputations test this claim:

**(1) The NFW shape never constrained $n$.** A fine scan of the Hernquist convolution shows the log-space $R^2$ of the NFW fit is flat at the 0.005 level across $n \\in [1.50, 2.60]$; the gap between $n = 2.00$ and the scan maximum is only 0.0025. The previously quoted "optimal" $n = 2.18$ was within this plateau and should not be read as a measurement. The NFW shape is consistent with the bare prediction but cannot discriminate at the $\\pm 0.5$ level.

**(2) The joint outer kernel sits on the prediction.** Fitting a single shared $n_{\\text{outer}}$ and shared $\\alpha_0$ to the outer regions ($R \\geq 300$ kpc) of all four KiDS mass bins yields $n_{\\text{outer}} = 2.05 \\pm 0.04$, with the parameter-free prediction $n = 2.00$ at $1.3\\sigma$ ($\\Delta\\chi^2 = +1.7$). Per-bin, three of four bins individually prefer 1.90–2.00; bin 2 mildly prefers 2.20 ($\\Delta\\chi^2 = 6$, $\\sim 2\\sigma$), a residual tension we report rather than absorb.

**(3) The two-zone model wins at equal parameter count.** We compare two global models with exactly two free parameters each: (i) a single-$n$ fit ($n$, $\\alpha_0$), and (ii) a two-zone fit with the inner kernel free (dressed), the outer kernel fixed at the bare value $n = 2.00$, amplitude continuity at 300 kpc, and one shared $\\alpha_0$. The results:

| Model | Free params | Best fit | Global $\\chi^2$ |
|-------|-------------|----------|------------------|
| Single-$n$ | 2 | $n = 1.70$ | 322.7 |
| Two-zone ($n_{\\text{out}} = 2.00$ fixed) | 2 | $n_{\\text{in}} = 1.35$ | 166.6 |

The two-zone structure improves the fit by $\\Delta\\chi^2 = -156$ at identical parameter count ($\\chi^2_r \\approx 2.9$ over 58 degrees of freedom, versus $\\approx 8.9$ for NFW's 8-parameter fit on the same data). Fixing the outer exponent at the QFT prediction costs nothing; the data actively demand the dressed-plus-bare structure. The result was verified independently on the author's original analysis pipeline ($\\Delta\\chi^2 = -158.8$ under the original grid-search conventions; the $\\sim 10\\%$ difference in absolute $\\chi^2$ between pipelines stems from the analytic versus grid treatment of $\\alpha_0$ and does not affect the comparison).

This reframing also retroactively explains why $n \\approx 1.5$ performed best in the SPARC rotation-curve fits (Section 10.4): galaxy disks are the dense, dressed regime, where $n_{\\text{eff}} \\approx 1.35$–$1.5$ is exactly the operative value.

### 12.5 Robustness: Dressing versus Unmodelled Astrophysics

The two-zone preference could in principle be an artifact: the shallow 30–300 kpc shape of the stacked ESD might reflect baryons or structure missing from our source model rather than kernel physics. We pre-registered and ran a discriminating test against the two known candidates. Cold gas was added at the amplitude adopted by the parent lensing analysis, $\\log_{10} f_{\\text{cold}} = 6.63 - 0.69 \\log_{10}(M_\\star/h^{-2}M_\\odot)$ [25, 22], giving $f_{\\text{cold}} = 1.39, 0.26, 0.18, 0.13$ for the four bins, with both the parent analysis's spatial prescription (gas tracks the stellar profile) and an extended variant ($R_{d,\\text{gas}} = 2 R_d$) tested at fixed amplitude. Faint satellites—those below the parent sample's 10%-of-central isolation threshold—were modelled as $\\rho \\propto r^{-2}$ over 20–300 kpc with a single global mass fraction $f_{\\text{sat}} \\leq 0.3$, a ceiling roughly three times the literature expectation. Miscentring was deliberately omitted as inapplicable: the framework's halo is centred on its baryonic source by construction, so the omission removes flexibility from the bare model and is conservative.

| Model | Free params | Global $\\chi^2$ |
|-------|-------------|------------------|
| Bare $n = 2$, stars only | 1 | 776.3 |
| + cold gas (tracks stars / extended) | 1 | 726.4 / 703.2 |
| + satellites ($f_{\\text{sat}}$ free) | 2 | 588.0 ($f_{\\text{sat}}$ pegged at 0.30) |
| Two-zone + cold gas | 2 | 131.3 ($n_{\\text{in}} = 1.35$) |
| Adjudicator: two-zone + gas + satellites | 3 | 131.3 ($n_{\\text{in}} = 1.35$, $f_{\\text{sat}} = 0.00$) |

At equal two-parameter count, the bare-plus-systematics model falls short of the dressed model by $\\Delta\\chi^2 = +457$: known gas closes less than a fifth of the gap, and even an implausibly large satellite term cannot close the rest. The adjudicator fit is the cleanest statement: offered both mechanisms simultaneously, the data set the satellite fraction to exactly zero and retain full dressing. This is independently corroborated by the parent analysis itself, which found that for galaxies with $M_\\star < 10^{11} h^{-2}M_\\odot$—the entire present sample—the contributions of hot gas and satellites to the ESD are small compared to stars and cold gas, and that satellite contamination enters only at $R > 0.3 h^{-1}$ Mpc [22]; the same $\\rho \\propto r^{-2}$ satellite profile adopted here is the one they model. Two further corroborating notes: (i) adding the correct baryons improved the dressed fit (166.6 → 131.3, $\\chi^2_r \\approx 2.3$, versus 464.2 for NFW's 8-parameter fit on identical data)—an artifact absorbing missing baryons would have weakened, not strengthened; (ii) every number in this test was reproduced to the decimal on the author's independent analysis pipeline. The dressing is a property of the kernel's response to the data, not of unmodelled astrophysics.

### 12.6 Comparison with the Milky Way

The two-zone profile is not NFW-like: fitting the NFW form to it over 5–100 kpc returns $R_s \\approx 130$–530 kpc, an order of magnitude above the 15–25 kpc obtained when NFW is fitted to Milky Way data. Since NFW is only a fitting function, the meaningful confrontation uses the model's calibrated physical prediction. With $\\alpha_0 = 2.8 \\times 10^{-3}$ fixed by the global lensing fit, the predicted enclosed mass and circular velocity for an isolated $\\log M_\\star = 10.70$ galaxy—bin 3, the Milky Way's stellar mass—are:

| $r$ (kpc) | $M(<r)$ ($M_\\odot$) | $v_c$ (km s⁻¹) |
|-----------|---------------------|-----------------|
| 30 | $1.5 \\times 10^{11}$ | 148 |
| 50 | $2.8 \\times 10^{11}$ | 156 |
| 100 | $7.6 \\times 10^{11}$ | 181 |
| 200 | $2.3 \\times 10^{12}$ | 221 |
| 300 | $4.4 \\times 10^{12}$ | 251 |

At 100 kpc this sits 10–30% above the Milky Way measurements—$M(<100\\text{ kpc}) = 5.78 \\pm 0.29 \\times 10^{11} M_\\odot$ from halo stars [27] and $6.9^{+0.5}_{-0.4} \\times 10^{11} M_\\odot$ from the H3 survey [28]—consistent within current systematics. (An earlier iteration of this analysis claimed a factor 3–5 overshoot; that figure arose from anchoring the profile to the Milky Way's own inner velocity rather than to the lensing calibration, and is retracted.) At halo scales the prediction ($2.3 \\times 10^{12} M_\\odot$ within 200 kpc) exceeds the Milky Way's $M_{200} \\approx 1.1 \\times 10^{12} M_\\odot$ [28] by a factor $\\approx 2$. Two population-level facts bear directly on this. First, satellite-kinematics and stellar-to-halo-mass determinations place typical halos at this stellar mass at $\\log M_h \\approx 12.2$–12.4 [26], and the Milky Way is independently documented as undermassive for its stellar mass—an unusually efficient outlier [29, 30, 31]. Second, the Milky Way fails the parent sample's isolation criterion outright (a comparable-mass companion, M31, within 3 Mpc), so it lies outside the calibrated population. At the population level the calibrated outer masses sit at the heavy end of, but within, the measured range—while the Milky Way sits at the light end.

We also close an escape route entertained in an earlier version of this analysis: a density-dependent transition radius cannot reconcile per-galaxy differences here, because bin 3 matches the Milky Way in stellar mass and disk scale, so any local-density criterion assigns both the same $R_t$; and the environmental direction backfires, since the lens sample is isolation-selected while the Milky Way is not.

Two bounded residuals remain, which we name precisely. **(i) Inner offset.** The stacks carry roughly half the Milky Way's enclosed mass inside 30–40 kpc (model $v_c(30) = 148$ versus the Milky Way's $\\approx 210$ km s⁻¹). This is a property of the data, inherited by any model of it including NFW: a direct SIS deprojection of the innermost bin-3 points gives $M(<35\\text{ kpc}) \\approx 1.2 \\times 10^{11} M_\\odot$ against the Milky Way's $\\approx 3 \\times 10^{11}$. Either stacking systematics suppress the inner signal, or the Milky Way is genuinely inner-overmassive relative to isolated peers—consistent with its documented compactness and high star-formation efficiency. **(ii) Outer shape.** The calibrated profile predicts a rising circular velocity (181 → 251 km s⁻¹ from 100 to 300 kpc) where an NFW halo flattens and declines. Stacked lensing is currently the only shape-sensitive probe of this regime—and prefers the two-zone form—so the decisive independent falsifier is stacked satellite velocity-dispersion profiles (not integrated masses) around isolated Milky-Way-mass centrals, where rising versus flat is directly measurable. A suggestive but inconclusive hint points the framework's way: satellite-kinematics halo masses at these stellar masses run systematically higher than lensing-inferred NFW masses, which is the signature a rising profile would produce; conventional explanations exist, and we claim no more than consistency.

### 12.7 Implications for the Framework

Under this reframing the kernel's status changes qualitatively: the bare scaling dimension is no longer a fitted parameter but the parameter-free free-scalar-field prediction $\\Delta_{\\text{bare}} = 1$, measured in the sparse regime at $2.05 \\pm 0.04$ ($1.3\\sigma$ from prediction). The fitted quantity becomes the dressing depth $n_{\\text{eff}} \\approx 1.35$ in baryon-dense regions—now established as robust against measured cold gas and faint satellites (Section 12.5)—with a clear physical derivation target: in-medium correlation physics must yield both $n_{\\text{eff}} \\approx 1.35$ and the transition radius $R_t \\approx 300$ kpc. The framework's named galactic-scale falsifiers are the satellite-dispersion-profile test of the rising outer shape (Section 12.6) and cluster-merger universality (Section 13).

## 13. The Bullet Cluster

The Bullet Cluster (1E0657-558, $z = 0.296$) [11]—a system of two galaxy clusters caught mid-collision—provides a stringent test of the framework. Hot X-ray emitting intracluster gas, which constitutes $\\sim 87\\%$ of the total baryonic mass, has been displaced from the galaxy distributions by ram-pressure stripping. Gravitational lensing reconstructions show that the convergence ($\\kappa$) peaks at the galaxy positions, offset from the X-ray gas peaks by $\\sim 200$ kpc in the subcluster (the "bullet") with $\\gtrsim 8\\sigma$ significance. This result is widely regarded as the cleanest direct evidence for non-baryonic dark matter, since modified gravity theories that source gravity from total baryonic mass predict $\\kappa$ should track the dominant gas component.

### 13.1 Failure of the Naive Framework

Before introducing the coherence-weighted treatment of Section 3.4, we test the simplest application of the framework: convolve the total baryonic mass density (gas + stars) uniformly with the kernel and ask where the resulting $\\rho_{\\text{info}}$ peaks.

We model the Bullet Cluster with realistic parameters from Markevitch et al. [12] and Clowe et al. [11]: a main cluster ($M_{\\text{gas}} = 5.5 \\times 10^{13} M_\\odot$, King-β profile with $r_c = 280$ kpc, $\\beta = 0.69$) and a subcluster bullet ($M_{\\text{gas}} = 10^{13} M_\\odot$, $r_c = 80$ kpc, $\\beta = 1.0$). Stellar populations are modelled as exponential profiles with $M_\\star \\approx 1.5\\%$ of total cluster mass, located at the galaxy centroids. The bullet's galaxy centroid is offset from its gas peak by 200 kpc.

With $\\eta = 1$ for all baryons and the cluster-scale bare kernel $n = 2.0$ (Section 12), the convolution predicts $\\rho_{\\text{info}}$ peaks within $\\sim 13$ kpc of the gas peaks but $\\sim 187$ kpc from the galaxy peaks. The naive framework fails to reproduce the observed offset—the same failure mode as MOND and Verlinde's emergent gravity.

This failure is informative. It tells us that the framework, as originally formulated with $\\rho_{\\text{info}}$ sourced uniformly by total baryonic mass, cannot account for cluster mergers. Either the framework is wrong at cluster scales, or our notion of what counts as the "source" for the kernel needs to be refined.

### 13.2 Resolution via the Coherence Fraction

The refinement is the coherence fraction $\\eta(\\mathbf{x})$ introduced in Section 3.4, governed by the record-writing criterion: $\\eta$ is low only for systems actively writing irreversible records of their bulk configuration into an external sink. The shocked intracluster gas satisfies all three conditions—optically thin, embedded in a far colder background, and undergoing violent irreversible restructuring—so $\\eta_{\\text{gas}} < 1$. The stellar component is collisionless and its bulk gravitational configuration evolves conservatively, so $\\eta_\\star \\approx 1$.

With $\\eta_\\star = 1$ and $\\eta_{\\text{gas}} \\lesssim 0.1$, the convolution shifts: the kernel preferentially weights the stellar contribution, and $\\rho_{\\text{info}}$ peaks at the galaxy centroids within $\\sim 13$ kpc. The transition between scenarios occurs at $\\eta_{\\text{gas}} \\approx 0.2$: below this threshold, the predicted $\\rho_{\\text{info}}$ tracks the galaxies rather than the gas. Importantly, the same record-writing criterion assigns $\\eta = 1$ exactly to the optically thick, equilibrium early universe (Section 3.4), so the mechanism invoked here does not disturb the cosmological sound horizon—a consistency the earlier temperature-based assignment failed.

### 13.3 The Quantitative Gap: η_gas ≈ 0.1 Is Not Derived

The record-writing criterion derives the direction ($\\eta_{\\text{gas}} < 1$) but we must report that the most constrained quantitative accounting does not deliver the required magnitude. Taking the criterion literally—each committed bit dumps $k_B T \\ln 2$ into the escaping radiation—the number of configuration bits erased since the collision is $N_{\\text{committed}} = L_X t / (k_B T \\ln 2)$, against a total gas entropy of $N_{\\text{total}} = S_{\\text{gas}} / (k_B \\ln 2)$. With the observed values ($L_X \\approx 10^{45}$ erg s⁻¹, $T \\approx 15$ keV, $t \\approx 0.15$ Gyr, $M_{\\text{gas}} = 10^{13} M_\\odot$), the ratio is $N_{\\text{committed}}/N_{\\text{total}} \\approx 10^{-4}$, giving $\\eta \\approx 0.9999$—the gas has radiated far too little of its information to resolve its configuration (its cooling time, $\\sim 30$ Gyr, vastly exceeds the time since collision). Only a coarse-grained "bulk configuration cell" accounting reaches $\\eta < 1$, and that accounting contains undetermined choices (cell size, bits per cell) and is therefore not a derivation.

The honest status is thus asymmetric: the limiting case that protects cosmology ($\\eta = 1$ for trapped equilibrium) is exact, while the intermediate value the Bullet Cluster requires ($\\eta_{\\text{gas}} \\approx 0.1$) is not derived and is in tension with the most literal Landauer accounting. *The Bullet Cluster result is fittable within the framework, not predicted by it.*

### 13.4 Honest Caveats

We flag several limitations of this result explicitly:

1. **Post-hoc nature.** The coherence-weighted treatment was introduced in response to the failure of the naive framework on the Bullet Cluster, and the operative value $\\eta_{\\text{gas}} \\approx 0.1$ is constrained by the lensing data, not derived (Section 13.3).
2. **Validation requires other cluster mergers.** The same prescription must reproduce the observed lensing–gas configurations in other systems—particularly Abell 520 (the "Train Wreck" cluster, whose reported dark lensing core coincident with the gas is the dangerous case for any uniform gas-suppression story) [13] and MACS J0025.4-1222 [14]—without re-fitting. Such tests are work in progress.
3. **An untested alternative mechanism exists.** Rather than suppressing the gas's contribution, the hot dilute gas may source the kernel with a large effective smearing scale, spreading its contribution into a broad plateau and leaving the compact stellar sources as the only local peaks. This would evade the Landauer accounting problem entirely (the gas still gravitates) and connects to the same medium-dependent kernel physics as the dressing of Section 12. It has not yet been computed.
4. **Galactic-scale results are unaffected.** The KiDS-1000 and SPARC analyses (Sections 10.4–12) used stellar mass bins with $\\eta \\approx 1$ on the record-writing criterion. The cluster-scale refinement does not modify the galactic-scale predictions.

The Bullet Cluster result is therefore a conditional success: if the coherence-weighted treatment is the correct refinement, the framework reproduces the observed offset within $\\sim 13$ kpc—but the required coherence value is currently phenomenological, and the most constrained derivation pushes against it. We state this plainly rather than claim the Bullet Cluster as evidence for the framework.

## 14. What is Fit, What is Derived, and What is Chosen

A persistent question for any framework with multiple parameters is whether it is genuinely predictive or merely flexibly fits available data. To address this directly, Table 4 summarises every quantity in the framework's empirical predictions and identifies its status: derived from theory, fit to data, chosen by convention, or phenomenological pending derivation.

| Quantity | Status | How determined |
|----------|--------|----------------|
| Kernel form $C(d) = 1/d^n$ | Theoretical | Motivated by QFT mutual information decay [19]: $I(A:B) \\sim 1/d^{2\\Delta}$ for regions separated by $d$. |
| Bare scaling dimension $\\Delta_{\\text{bare}}$ | Predicted | Free scalar field value $\\Delta = 1$ ($n = 2$), parameter-free from QFT [19]. Measured jointly in the sparse regime: $n_{\\text{outer}} = 2.05 \\pm 0.04$, prediction at $1.3\\sigma$ (Sec. 12.4). |
| Dressing depth $n_{\\text{eff}}$ (dense regions) | Fit | $n_{\\text{eff}} = 1.35$ from the two-zone KiDS fit ($\\Delta\\chi^2 = -156$ vs. single-$n$ at equal parameter count). Derivation target: propagator dressing in a medium, which must also predict the density-dependent transition radius (Sec. 12.6). |
| $\\alpha$ per galaxy | Derived | Steady-state equation predicts $\\alpha \\propto M^{-0.491}$. Measured $\\alpha \\propto M^{-0.594 \\pm 0.052}$ in SPARC; agreement to $2.0\\sigma$ (Sec. 10.4). |
| Normalisation $\\alpha_0$ | Fit | Calibrated from KiDS-1000 weak lensing data (Sec. 11). |
| Coherence fraction $\\eta$ | Mixed | Limiting values derived from Landauer's principle: $\\eta = 1$ exact for trapped equilibrium and conservative systems (Sec. 3.4). Intermediate values phenomenological: the Bullet Cluster requires $\\eta_{\\text{gas}} \\lesssim 0.2$, but the constrained Landauer accounting gives $\\approx 1$ (Sec. 13.3). |
| UV softening $\\epsilon$ | Numerical | Regularisation only; affects sub-kpc behaviour. |

*Table 4: Status of each quantity in the framework's empirical predictions. The bare kernel exponent is now a parameter-free QFT prediction confirmed at $1.3\\sigma$; the fitted galactic-scale quantities are the dressing depth $n_{\\text{eff}}$ and the normalisation $\\alpha_0$; the $\\alpha$–$M$ exponent is derived; the cluster coherence value remains phenomenological.*

**What this tells us about the framework's status.** The framework has one genuine prediction-then-test in the literal sense (the steady-state derivation predicted $\\alpha \\propto M^{-0.491}$ before SPARC fits measured $M^{-0.594 \\pm 0.052}$), and one parameter-free theoretical value confirmed after the fact ($\\Delta_{\\text{bare}} = 1$, measured at $1.3\\sigma$ in the sparse regime). The other quantitative successes (NFW shape reproduction, KiDS-1000 lensing fits, Bullet Cluster offset) are consistency tests with one to two parameters fit per test.

The framework's strength is consistency across scales: with just two fit parameters at galactic scales ($n$, $\\alpha_0$), it reproduces multiple independent observations (NFW shape, SPARC rotation curves, KiDS lensing, scale-dependent kernel running) that conventionally require different mechanisms (NFW halo fitting, individual-galaxy mass models, dark matter concentration relations). At cluster scales the additional parameter $\\eta_{\\text{gas}}$ is required and is currently phenomenological.

This is honest disclosure rather than rhetoric: a reader can evaluate whether the framework's empirical content is predictive or descriptive, and we explicitly identify where each parameter sits. The framework should be judged accordingly.

---

**Part III — Conceptual Extensions**

---

The sections that follow develop broader implications of the framework—reinterpretations of spacetime, the speed of light, and quantum mechanics, and an outlook on cosmological structure. These extensions are conceptually motivated by the framework's empirical core but *have not been quantitatively tested*. We include them because they outline a coherent picture of what the framework could mean if the empirical successes generalise; we mark them as speculative so they are not conflated with the tested results of Part II.

## 15. Decomposition of Spacetime

If time is an emergent process and mass-gravity is an emergent property of the observation-cost landscape, then "spacetime" as a unified geometric object is an effective description, not fundamental.

Space is the arena of informational relationships between possible observations. Time is what happens when those relationships are irreversibly resolved. The metric tensor encodes how observation costs vary across the informational landscape.

This implies a preferred structure that general relativity's diffeomorphism invariance explicitly denies: the now-horizon is a physically real boundary defined by thermodynamic irreversibility, not an arbitrary coordinate choice. The spatial metric may also emerge from informational structure: two events are "far apart" because collapsing the informational entropy between them requires many intermediate observation steps. Spatial distance is informational distance.

## 16. The Speed of Light as Maximum Entropy Conversion Rate

Special relativity postulates that the speed of light $c$ is the universal speed limit, but does not explain why this limit exists. In this framework, $c$ acquires a thermodynamic meaning: it is the maximum rate at which the universe can convert informational entropy into thermodynamic records.

### 16.1 The Mechanism

Each observation event requires a minimum Landauer cost of $k_B T \\ln 2$ per bit. This cost is paid through energy dissipation, which propagates through fields at finite speed. The fastest any field can update—the fastest any record of an observation can propagate—is $c$, the speed of massless field excitations. Therefore:

$$c = \\text{max rate of entropy conversion propagation}$$

An object moving at velocity $v$ is a chain of observation events—a sequence of state commitments—propagating through possibility space. As $v \\to c$, the chain runs at the physical maximum of entropy conversion. Every available dissipation channel is saturated.

### 16.2 Why Massive Objects Cannot Reach c

A massive object has high informational complexity—many unresolved quantum correlations constituting its mass. Moving this entire informational structure at the maximum entropy conversion rate would require collapsing and recommitting all of its informational complexity at every point along the trajectory at the maximum possible rate. The Landauer cost of this diverges as $v \\to c$:

$$E_{\\text{Landauer}}(v) \\propto \\frac{m \\, c^2}{\\sqrt{1 - v^2/c^2}}$$

This divergence is the Lorentz factor $\\gamma$. The energy required to accelerate a massive object to $c$ is infinite because the information processing cost of moving its entire possibility structure at the maximum conversion rate is infinite.

A photon travels at $c$ because it has zero rest mass—zero informational complexity. It carries information but has no unresolved internal structure. There is nothing to collapse, no internal Landauer cost to pay. It is pure propagation of record with no observation required along the way.

### 16.3 Reinterpretation of E = mc²

The mass-energy equivalence acquires a direct informational interpretation:

$$E = mc^2 = (\\text{informational complexity}) \\times (\\text{max entropy conversion rate})^2$$

This is an accounting identity: the total energy bound in a system's unresolved possibility structure equals the maximum rate at which that structure could theoretically be fully collapsed, squared. To annihilate a particle—to completely collapse all of its informational complexity into radiation—costs exactly $mc^2$ in energy, because that is the total Landauer bill for converting its entire possibility structure into thermodynamic records at the maximum possible rate.

Matter-antimatter annihilation realises this directly: the two conjugate possibility structures mutually collapse each other's entire informational complexity, paying the full Landauer cost, producing pure radiation—photons at $c$ carrying the thermodynamic record but possessing zero remaining informational complexity.

## 17. Time as the Cost of Probability Change

The preceding sections defined time as the collapse of possibilities at the now-horizon. We now refine this to a deeper statement: time is the thermodynamic cost of probability distributions changing.

### 17.1 The Determinacy Gradient Revisited

Far from the now-horizon, an event has a broad probability distribution over many possible outcomes. As the now-horizon approaches, interactions with the environment progressively constrain the possibilities. The probability distribution sharpens: fewer branches remain viable, the distribution evolves from flat to peaked.

This sharpening is not free. Every incremental change in the probability distribution over an event's future constitutes a change in the universe's total informational complexity. By the framework's own rules, any change in informational complexity must be recorded as thermodynamic entropy. The Landauer cost must be paid.

Therefore, the now-horizon is not a sharp boundary but the steep end of a continuous gradient of probability resolution. Time does not flow in discrete moments of collapse. It flows continuously, driven by the thermodynamic cost of probability distributions narrowing:

$$\\frac{d\\tau}{dt} \\propto \\sum_{\\text{events}} \\left| \\frac{dp_i}{dt} \\right| \\cdot k_B T \\ln 2$$

where the sum runs over all events whose probability distributions are actively being updated, and $|dp_i/dt|$ is the rate of probability change for branch $i$.

### 17.2 Environmental Dependence of Temporal Flow

This mechanism explains why time flows at different rates in different environments:

**Hot, dense environments:** Thermal interactions constantly update the probability distributions of every particle. Every scattering event, every photon exchange, every phonon propagation is an incremental probability update with a Landauer cost. The total rate of probability sharpening is enormous. Time flows fast—not because of geometry, but because there is more probability resolution to record.

**Cold, sparse environments:** Probability distributions change slowly. Few interactions, few updates, few Landauer costs. Time flows slowly because there is less probability resolution occurring.

**Near a black hole:** The gravitational environment compresses the determinacy gradient into a tiny spatial region. Probability distributions for infalling matter narrow with extraordinary steepness. The Landauer cost of recording this rapid probability change overwhelms the available entropy conversion capacity. The now-horizon can barely advance. Time slows to a crawl because the probability gradient is too steep to record at the available energy budget.

### 17.3 Quantum Mechanics from Probability Costs

This formulation connects directly to quantum foundations:

**Schrödinger evolution** is the probability distribution reshaping between recording events. The wavefunction evolving unitarily is the probability landscape reconfiguring itself. Each reconfiguration has a Landauer cost that is eventually paid when the next recording event occurs.

**Wavefunction collapse** is the now-horizon advancing through a region of possibility space, committing the sharpened probability distribution to irreversible record.

**Quantum superposition** persists when no dissipation channel is available to pay the Landauer cost of collapsing the probability distribution. An isolated quantum system maintains coherence because the thermodynamic pathway for recording the probability resolution does not exist. The moment a dissipation channel opens—interaction with a thermal environment—collapse proceeds along the cheapest branches first.

**The uncertainty principle** follows from the conservation of informational complexity between observations. Sharpening the probability distribution on one variable (e.g. position) necessarily broadens it on the conjugate variable (momentum), conserving the total informational complexity. This redistribution costs no Landauer energy—it is an informational rearrangement, not a net change—so no time passes during the redistribution. The uncertainty principle is the conservation of informational complexity between recording events.

### 17.4 Foundational Statement

The deepest formulation of the framework is therefore:

*Time is not the collapse of possibilities. Time is the cost of probabilities changing.*

Every other result—time dilation, mass, gravity, dark matter, the speed of light—follows from this. If every probability update has a Landauer cost, then: the rate of time is the rate of probability updating; mass is the complexity of the probability structure being updated; gravity is the gradient toward regions where probability updating is densest; and $c$ is the maximum speed at which probability updates can propagate.

## 18. Causal Horizons and Possibility Pruning

Cosmic expansion produces causal horizons beyond which events cannot influence an observer. Informational entropy is reduced by two mechanisms:

1. **Collapse via observation**: high-probability branches are irreversibly committed to record.
2. **Horizon isolation**: entire branches become causally inaccessible and are pruned from the effective possibility space.

Spacetime expansion increases physical volume while contracting the effective future.

## 19. Cosmological Outlook

In principle, the framework's account of time as observation-cost-limited entropy conversion should extend to cosmological scales: the rate at which the now-horizon advances at any cosmic epoch should be set by the global observation capacity, $\\mathcal{O}(t) = \\dot{E}_{\\text{diss}}(t)/(k_B T(t) \\ln 2)$. In practice, however, the framework currently lacks a closed-form derivation of $\\mathcal{O}(t)$ from first principles. The choice of dissipation channels that dominate $\\dot{E}_{\\text{diss}}$ varies with cosmic epoch (radiation in the early universe, structure formation later, declining toward heat death), and the framework as developed at galactic scales does not yet specify how to combine these contributions.

### 19.1 What We Tested and Why It Did Not Work

We tested a simple ansatz in which observation capacity is approximated by the cosmic star formation rate density [9]: $\\mathcal{O}(z) \\propto \\dot{\\rho}_*(z)/(1 + z)$, with $\\dot{\\rho}_*$ given by the Madau–Dickinson parameterisation. Using this in place of the standard FLRW expansion history $H(z)$, we attempted to fit the Pantheon+ Type Ia supernova compilation [23]. The fit failed at $> 5\\sigma$ ($\\Delta\\chi^2 \\approx 800$ versus ΛCDM with the same number of free parameters): the SFR-based capacity does not track the redshift-luminosity distance relation.

A second test parameterised observation capacity as $\\mathcal{O}(z) \\propto [\\Omega_m(1 + z)^3 + (1 - \\Omega_m)]^p$, with an effective $H(z) = H_0 \\sqrt{\\mathcal{O}(z)}$. Joint fits to Pantheon+ and DESI DR1 baryon acoustic oscillation measurements [24] preferred $p \\approx 0.5$, the value at which the framework's $H(z)$ reduces algebraically to ΛCDM. In other words: the data prefer the framework's only free shape parameter to take the value that makes the framework indistinguishable from ΛCDM at the background expansion level.

A third test probed the Hubble tension. If the coherence fraction were governed by temperature—so that hot pre-recombination plasma had suppressed gravitating density—matter–radiation equality would be delayed and the comoving sound horizon would grow (by $\\sim 30\\%$ in our minimal implementation), driving the CMB-inferred $H_0$ further below the locally measured value and worsening the tension. We pre-registered this sign before computing, and the calculation confirmed it: a temperature-based coherence fraction is cleanly falsified at cosmological scales. This failure motivated the record-writing criterion of Section 3.4, under which the pre-recombination universe—optically thick, radiation-trapped, in detailed balance—has $\\eta = 1$ exactly: no external sink exists, so no irreversible records can be written and the gravitating density is unsuppressed. The sound horizon is then unmodified and the cosmological failure dissolves. We emphasise what this is and is not: it removes a wrong prediction and renders the framework consistent with the standard background expansion; it does not yet supply a distinctive one.

### 19.2 What This Means

These tests demonstrate that the framework's cosmological content, as currently developed, is either:

(a) **Wrong** (if the SFR proxy is supposed to represent observation capacity);
(b) **Indistinguishable from ΛCDM** at the level of $H(z)$ (if a more flexible parameterisation is used);
(c) **Currently undefined** (if neither parameterisation correctly represents the framework's principles).

We believe (c) is the honest interpretation. The framework specifies that observation capacity sets the rate of cosmic time, but without a first-principles derivation of $\\mathcal{O}(t)$, any parameterisation either imports ΛCDM assumptions through the back door (the $(1 + z)^3$ matter scaling) or guesses at the dissipation channels (the SFR).

### 19.3 What Needs to Be Done

To convert the framework's cosmological story from speculation to prediction, the following would have to be derived:

- The dominant dissipation channels at each cosmic epoch (radiation–matter equality, recombination, structure formation, vacuum-dominated era), with quantitative contributions to $\\dot{E}_{\\text{diss}}$.
- The local effective temperature $T(t)$ governing the Landauer cost at each epoch.
- The relationship between $\\mathcal{O}(t)$ and photon propagation: how does a photon's frequency change as it traverses regions of evolving observation capacity?
- Specific testable predictions distinguishable from ΛCDM at the level of CMB acoustic peaks, baryon acoustic oscillations, structure growth, or large-scale structure correlations.

Until these are derived, we make no quantitative cosmological claims. The framework's empirical successes (Part II) are at galactic and cluster scales; its cosmological content is currently a research programme rather than a tested result.

### 19.4 The Heat Death Picture

Qualitatively, the framework predicts that as the universe approaches thermodynamic equilibrium, $\\dot{E}_{\\text{diss}} \\to 0$ implies $\\mathcal{O}(t) \\to 0$ and $dS_{\\text{info}}/dt \\to 0$. Heat death becomes the exhaustion of observation capacity—not merely thermal uniformity, but the cessation of time itself. This picture is conceptually attractive and consistent with the framework's foundations, but should not be confused with a quantitative prediction.

---

**Part IV — Discussion**

---

## 20. Empirical Predictions

The framework generates testable predictions at multiple scales. We organise these into three categories: results already confirmed against data (Part II), novel predictions awaiting test, and reinterpretations of known physics.

### 20.1 Confirmed by Data (Part II)

1. **NFW halo shape from QFT kernel.** Convolving a Hernquist baryonic profile with a power-law correlation kernel reproduces the NFW dark matter halo profile shape with $R^2 \\approx 0.99$ across a plateau of exponents containing the free scalar field value $n = 2$; the shape is consistent with the parameter-free prediction but does not by itself discriminate the exponent (Section 9).
2. **α–M scaling exponent (genuine prediction).** The steady-state feedback equation predicts $\\alpha \\propto M_{\\text{bar}}^{2\\delta-1}$ from the galaxy size–mass relation. Using SPARC's measured $\\delta = 0.255 \\pm 0.016$, the prediction is $\\alpha \\propto M^{-0.491}$. Individual SPARC galaxy fits measure $\\alpha \\propto M^{-0.594 \\pm 0.052}$. Agreement to $2.0\\sigma$ (Section 10.4). This is the framework's strongest empirical claim: a quantitative scaling exponent derived from theory and confirmed against 171 galaxies.
3. **KiDS-1000 weak lensing.** The framework with two global parameters ($n$, $\\alpha_0$) outperforms NFW dark matter (8 parameters) in all four stellar mass bins, achieving total $\\chi^2_r = 5.65$ vs. 8.93 (Section 11).
4. **Scale-dependent kernel running and the bare prediction.** The kernel exponent runs from $n_{\\text{inner}} \\approx 1.25$–1.35 at $R < 300$ kpc to the bare regime at larger radii, consistent in 12/12 mass-bin/split-radius combinations ($p < 0.02\\%$). The joint outer measurement is $n_{\\text{outer}} = 2.05 \\pm 0.04$, placing the parameter-free free-scalar-field prediction $n = 2$ at $1.3\\sigma$; a two-zone model with the outer kernel fixed at $n = 2$ improves the global KiDS fit by $\\Delta\\chi^2 = -156$ at equal parameter count (Sections 12–12.4). The dressed shape survives a pre-registered robustness test against measured cold gas and faint satellites (Section 12.5); with the gas included, the two-zone fit reaches $\\chi^2_r \\approx 2.3$ versus $\\approx 8.9$ for NFW on the same data.
5. **Bullet Cluster offset (conditional).** The coherence-weighted treatment ($\\eta_\\star \\approx 1$, $\\eta_{\\text{gas}} \\lesssim 0.2$) reproduces the observed $\\sim 200$ kpc offset between gas and lensing peaks within $\\sim 13$ kpc. This is conditional on the coherence framework introduced in response to the test, pending independent validation (Section 13).

### 20.2 Novel Predictions Awaiting Test

6. **Cluster merger systematics.** The framework predicts gas–lensing offsets in Abell 520 and MACS J0025.4-1222 to follow from the same coherence-fraction physics as the Bullet Cluster, with $\\eta_{\\text{gas}}$ values predictable from the local thermalisation state (temperature, Mach number relative to local sound speed). Tests against published lensing reconstructions are work in progress.
7. **Rising outer halo profiles of isolated Milky-Way-mass centrals.** The lensing-calibrated two-zone profile predicts circular velocity rising from $\\approx 180$ to $\\approx 250$ km s⁻¹ between 100 and 300 kpc for isolated $\\log M_\\star \\approx 10.7$ galaxies—directly testable with stacked satellite velocity-dispersion profiles, and distinct from the flat-to-declining NFW expectation (Section 12.6).
8. **Direct dark matter detection will continue to fail.** Particle dark matter searches (XENON, LZ, ADMX, etc.) should produce null results, because the gravitational signature attributed to dark matter is informational structure rather than particles.
9. **The kernel dressing should be derivable from in-medium QFT.** The bare scaling dimension is confirmed at $1.3\\sigma$ ($n_{\\text{outer}} = 2.05 \\pm 0.04$ against the parameter-free prediction $n = 2$); what remains is the dressing. In-medium correlation physics must yield both the dressed exponent $n_{\\text{eff}} \\approx 1.35$ and the transition radius $R_t \\approx 300$ kpc. Success would render the kernel fully parameter-free; failure to produce either value falsifies the dressing interpretation.
10. **Coherence fraction η should be derivable from quantum thermodynamics.** A rigorous expression for $\\eta$ as a functional of local density matrix coherence properties (collision frequency, temperature, Mach number) would replace the current phenomenological values with predictions.
11. **Larger SPARC samples will tighten the α–M exponent agreement.** BIG-SPARC (anticipated $\\sim 4000$ galaxies) should reduce the measurement error on the exponent from $\\pm 0.052$ to $\\pm 0.025$, with the framework predicting a value near $-0.491$. Departures could indicate the steady-state model needs refinement (e.g. density-dependent destruction efficiency).

### 20.3 Reinterpretations of Known Physics

The framework also offers reinterpretations of phenomena previously taken as axiomatic or unexplained. These are not predictions in the falsifiable sense—they recover existing physics—but they constrain the framework's internal consistency:

- Gravitational and velocity-based time dilation reproduce the Schwarzschild and Lorentz factors via observation-capacity arguments (Sections 5.2–5.3), albeit using the Tolman–Ehrenfest relation which presupposes general relativity.
- Newton's three laws follow from informational principles (Section 7.8), with the third law tracing to the symmetry of mutual information.
- The Bekenstein bound is reinterpreted as an accounting identity between informational entropy and observation budget (Section 6.4).
- Black hole event horizons correspond to the divergence of observation cost per bit (Section 7.4).

## 21. Discussion

### 21.1 Relation to Existing Frameworks

This framework intersects with several established programmes. Verlinde's entropic gravity [5] derives Newton's law from entropy gradients on holographic screens; our approach provides a specific mechanism (Landauer cost of temporal evolution) and extends it to predict dark matter profiles. The holographic principle [3, 4] bounds entropy by area; we reinterpret this as an accounting constraint on observation budgets. The ER=EPR conjecture [20] links spacetime geometry to entanglement; our framework provides a thermodynamic channel through which entanglement structures produce effective mass.

### 21.2 Limitations and Open Questions

The gravitational time dilation derivation (Section 5.2) uses the Tolman–Ehrenfest relation as input, which presupposes general relativity. A fully self-consistent derivation would require deriving the metric from informational first principles—showing that the observation-cost landscape *produces* the Einstein field equations, not merely is consistent with them.

The velocity-based time dilation argument (Eq. 19) is qualitative. A rigorous treatment would require specifying exactly how relativistic boosts modify the observation capacity through the thermal environment.

The NFW calculation (Section 9) demonstrates that the *shape* of the informational complexity profile matches observations, but the *normalisation*—the ratio of informational complexity to baryonic mass—is a free parameter. Determining this ratio from first principles requires a full quantum gravitational calculation.

The bare scaling dimension is no longer fitted: it is the parameter-free free-scalar value $\\Delta = 1$, measured in the sparse regime at $1.3\\sigma$ (Section 12.4), with one mass bin retaining a mild $\\sim 2\\sigma$ preference for a steeper outer exponent. What remains empirical is the environmental dressing—$n_{\\text{eff}} \\approx 1.35$ with transition radius $R_t \\approx 300$ kpc—whose derivation from in-medium correlation physics is the framework's most important open calculation.

The coherence fraction $\\eta$ (Section 3.4) is partially derived: its limiting values follow from Landauer's principle ($\\eta = 1$ exactly for trapped equilibrium matter; $\\eta \\approx 1$ for conservative systems; $\\eta < 1$ for sink-coupled irreversible restructuring), but the quantitative function for intermediate states does not, and the most constrained accounting for the Bullet Cluster's shocked gas yields $\\eta \\approx 1$ rather than the required $\\lesssim 0.2$ (Section 13.3). The Bullet Cluster value $\\eta_{\\text{gas}} \\approx 0.1$ is therefore fitted, not predicted. A rigorous test requires the same prescription to reproduce the gas–lensing configurations of other cluster mergers without re-fitting—particularly Abell 520, whose reported dark lensing core is the dangerous case—and the untested smearing alternative (Section 13) must be computed. Until then, the cluster-scale treatment remains phenomenological.

### 21.3 Computational Interpretation

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

## 22. Conclusion

Time emerges as the irreversible conversion of unobserved possibilities into physical records. The present is a local horizon where observation commits reality, and its rate of advance is governed by the thermodynamic cost of that commitment.

Mass is the informational complexity that determines observation cost. Gravity is a statistical bias in the branching structure of possibility space: objects follow trajectories of maximum total entropy production, moving toward regions where the density of collapsible branches is highest. Individual observation events follow the efficiency gradient (cheapest branch first); bulk trajectories follow the entropy production gradient (most total dissipation). Orbits are observation-efficient equilibria. The universality of gravity follows because all systems inhabit the same possibility space.

The relationship between informational complexity and mass is self-reinforcing: observation in informationally dense regions generates thermodynamic entropy, which contributes mass-energy, which raises the Landauer cost, which slows the now-horizon further. This feedback loop drives gravitational collapse and structure formation. In its extremal limit, it produces black holes—regions where the observation cost per bit diverges and the now-horizon halts.

Dark matter is the gravitational signature of informationally complex regions of possibility space that lack baryonic substrate. The informational complexity density around a Milky Way-like galaxy, computed from quantum field theory-motivated correlation kernels, reproduces the NFW dark matter halo profile with $R^2 = 0.993$ and predicts flat rotation curves without invoking particle dark matter. The coupling constant governing the information–gravity connection is not free: it is determined by the steady-state balance between correlation generation and observational destruction, yielding a predicted mass scaling $\\alpha \\propto M^{-0.491}$ that agrees with the measured $\\alpha \\propto M^{-0.594 \\pm 0.052}$ across 171 SPARC galaxies to within $2\\sigma$.

Tested against stacked weak gravitational lensing profiles from the KiDS-1000 survey, the informational complexity model outperforms NFW dark matter fits in all four stellar mass bins, using 2 global parameters versus 8. The correlation kernel exhibits a consistent scale dependence—softer in dense inner halos, steeper in sparse outer regions—confirmed in 12 out of 12 independent tests ($p < 0.02\\%$). The bare exponent measured jointly in the sparse regime is $n_{\\text{outer}} = 2.05 \\pm 0.04$, placing the parameter-free free-scalar-field prediction $n = 2$ at $1.3\\sigma$; fixing the outer kernel at this predicted value within a two-zone (dressed-plus-bare) model improves the global lensing fit by $\\Delta\\chi^2 = -156$ at equal parameter count ($\\chi^2_r \\approx 2.9$ versus $\\approx 8.9$ for NFW), consistent with quantum field theory propagator dressing in a baryonic medium.

The framework approaches zero truly free parameters: the coupling constant is determined by the steady-state equation, and the correlation kernel is characterised by a bare scaling dimension ($\\Delta_{\\text{bare}} \\approx 1.0$, near the free scalar field value) that is potentially derivable from QFT, dressed by the local baryonic environment.

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
12. M. Markevitch et al., "A Textbook Example of a Bow Shock in the Merging Galaxy Cluster 1E 0657-56," *Astrophys. J. Lett.* **567**, L27 (2002).
13. A. Mahdavi et al., "A Dark Core in Abell 520," *Astrophys. J.* **668**, 806 (2007).
14. M. Bradač et al., "Revealing the Properties of Dark Matter in the Merging Cluster MACS J0025.4-1222," *Astrophys. J.* **687**, 959 (2008).
15. G. Bertone, D. Hooper, and J. Silk, "Particle dark matter: evidence, candidates and constraints," *Phys. Rep.* **405**, 279 (2005).
16. E. Aprile et al. (XENON Collaboration), "Dark Matter Search Results from a One Ton-Year Exposure of XENON1T," *Phys. Rev. Lett.* **121**, 111302 (2018).
17. F. Nesti and P. Salucci, "The Dark Matter halo of the Milky Way, AD 2013," *JCAP* **2013**, 016 (2013).
18. P. Calabrese and J. Cardy, "Entanglement entropy and quantum field theory," *J. Stat. Mech.* **0406**, P06002 (2004).
19. J. Cardy, "Some results on the mutual information of disjoint regions in higher dimensions," *J. Phys. A* **46**, 285402 (2013).
20. J. Maldacena and L. Susskind, "Cool horizons for entangled black holes," *Fortsch. Phys.* **61**, 781 (2013).
21. F. Lelli, S. S. McGaugh, and J. M. Schombert, "SPARC: Mass Models for 175 Disk Galaxies with Spitzer Photometry and Accurate Rotation Curves," *Astron. J.* **152**, 157 (2016).
22. M. M. Brouwer et al., "The weak lensing radial acceleration relation: Constraining modified gravity and cold dark matter theories with KiDS-1000," *A&A* **650**, A113 (2021).
23. D. Brout et al., "The Pantheon+ Analysis: Cosmological Constraints," *Astrophys. J.* **938**, 110 (2022).
24. DESI Collaboration, A. G. Adame et al., "DESI 2024 VI: Cosmological Constraints from the Measurements of Baryon Acoustic Oscillations," arXiv:2404.03002 (2024).
25. A. Boselli, L. Cortese, and M. Boquien, "Cold gas properties of the Herschel Reference Survey," *A&A* **564**, A66 (2014).
26. S. More, F. C. van den Bosch, M. Cacciato, R. Skibba, H. J. Mo, and X. Yang, "Satellite kinematics – III. Halo masses of central galaxies in SDSS," *Mon. Not. R. Astron. Soc.* **410**, 210 (2011).
27. A. J. Deason et al., "The mass of the Milky Way out to 100 kpc using halo stars," *Mon. Not. R. Astron. Soc.* **501**, 5964 (2021).
28. J. Shen et al., "The Mass of the Milky Way from the H3 Survey," *Astrophys. J.* **925**, 1 (2022).
29. L. Posti and A. Helmi, "Mass and shape of the Milky Way's dark matter halo with globular clusters from Gaia and Hubble," *A&A* **621**, A56 (2019).
30. T. C. Licquia and J. A. Newman, "Improved Estimates of the Milky Way's Stellar Mass and Star Formation Rate from Hierarchical Bayesian Meta-Analysis," *Astrophys. J.* **806**, 96 (2015).
31. N. Boardman et al., "Are the Milky Way and Andromeda unusual? A comparison with Milky Way and Andromeda analogues," *Mon. Not. R. Astron. Soc.* **498**, 4943 (2020).
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
        gap: '0.75rem',
        flexWrap: 'wrap',
        padding: '1rem 2rem 0',
      }}>
        <a
          href="/time_as_entropy_conversion_paper_v3.pdf"
          download="time_as_entropy_conversion_v3.pdf"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            background: 'rgba(255, 140, 100, 0.1)',
            border: '1px solid rgba(255, 140, 100, 0.3)',
            borderRadius: '6px',
            color: '#ff9f7f',
            fontSize: '0.9rem',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(255, 140, 100, 0.2)';
            e.currentTarget.style.borderColor = '#ff9f7f';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(255, 140, 100, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 140, 100, 0.3)';
            e.currentTarget.style.color = '#ff9f7f';
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Download PDF
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
