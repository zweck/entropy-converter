# ⏳ Time as Observation-Limited Entropy Conversion

**What if time, mass, gravity, and dark matter all emerge from the same thing?**

This is an interactive companion to a theoretical framework proposing that time emerges from the irreversible conversion of unobserved possibilities into physical records — and that mass, gravity, and dark matter are consequences of the same informational mechanism.

🔗 **[Read the paper →](https://entropy-converter.pages.dev)**

---

## The Idea

The universe has two kinds of entropy:

- **Informational entropy** — the branching space of things that *could* happen
- **Thermodynamic entropy** — the irreversible record of things that *did* happen

Time is what happens when the first becomes the second. The "now" is the boundary where possibilities become history — a **now-horizon** that advances at a rate governed by the local cost of observation.

Because [Landauer's principle](https://en.wikipedia.org/wiki/Landauer%27s_principle) ties the cost of each irreversible bit commitment to local temperature, observation is **cheaper in cold environments** and **more expensive in hot ones**. This naturally reproduces relativistic time dilation — not as a geometric axiom, but as a thermodynamic consequence.

## v2 Paper — Quantitative Predictions

The v2 paper extends the framework with concrete, testable predictions:

- **NFW halo profile reproduction** — Convolving a Hernquist baryonic profile with a power-law correlation kernel ($n = 2.18$, $\Delta = 1.09$) reproduces the NFW dark matter halo with **R² = 0.993** and scale radius $R_s = 20.8$ kpc
- **α–M scaling prediction** — The coupling constant α is *predicted* (not fitted) from the steady-state feedback equation: α ∝ M^(−0.491), agreeing with the measured α ∝ M^(−0.594 ± 0.052) across 171 SPARC galaxies to within **2.0σ**
- **KiDS-1000 weak lensing validation** — Tested against stacked ESD profiles from the KiDS-1000 survey, the model **outperforms NFW dark matter in all four stellar mass bins** (total reduced χ² = 5.65 vs. 8.93) using **2 global parameters versus 8**
- **Scale-dependent correlation kernel** — The kernel runs with scale: softer in dense inner halos ($n \approx 1.25$), steeper in sparse outer regions ($n \approx 2.0$), confirmed in **12 out of 12** mass-bin/split-radius combinations ($p < 0.02\%$). The outer value converges on the theoretical prediction, consistent with QFT propagator dressing
- **Approaching zero free parameters** — The coupling constant is fixed by the steady-state equation, and the correlation kernel has a bare scaling dimension $\Delta_\text{bare} \approx 1.0$ (near the free scalar field value) potentially derivable from QFT

📄 **[Download the PDF →](https://entropy-converter.pages.dev/time_as_entropy_conversion_paper_v2.pdf)** · **[LaTeX source →](https://entropy-converter.pages.dev/paper.tex)**

## Interactive Visualisations

| Tab | What it shows |
|-----|---------------|
| **Entropy** | Real-time conversion of informational → thermodynamic entropy using cosmological data (Madau-Dickinson star formation rates) |
| **Causal Horizons** | How cosmic expansion prunes possibility space by isolating regions beyond causal contact |
| **CPU** | The computational analogy — the universe as a processor whose clock rate is set by observation cost |
| **Simulation** | Interactive branching simulation — watch possibilities collapse into history |
| **SPARC Data** | Validation results from 171 SPARC galaxies — rotation curve fits, χ² distributions, and the α–M scaling prediction |
| **KiDS-1000** | Weak lensing validation against Brouwer et al. 2021 — Info vs NFW fits across four stellar mass bins, and the running correlation kernel |
| **Paper** | The full v2 paper with LaTeX rendering and text-to-speech narration |

## Tech Stack

- **React 19** + **Vite 7** — UI framework
- **Three.js** / **React Three Fiber** — 3D visualisations
- **KaTeX** — LaTeX math rendering
- **Cloudflare Pages** — hosting
- **Cloudflare Workers AI** — text-to-speech for paper narration
- **Cloudflare KV** — TTS audio caching

---

*"Time is the irreversible conversion of unobserved possibilities into physical records. Its local rate is determined by the thermodynamic cost of observation. Mass is observation resistance. Gravity is the gradient of that resistance. Dark matter is observation resistance without matter. Relativity is observation economics."*
