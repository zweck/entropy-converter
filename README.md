# ⏳ Time as Observation-Limited Entropy Conversion

**What if time isn't a dimension — but a process?**

This is an interactive companion to a theoretical framework proposing that time emerges from the irreversible conversion of unobserved possibilities into physical records. Its local rate is determined by the thermodynamic cost of observation. Relativity is observation economics.

🔗 **[Read the paper →](https://entropy-converter.pages.dev)**

---

## The Idea

The universe has two kinds of entropy:

- **Informational entropy** — the branching space of things that *could* happen
- **Thermodynamic entropy** — the irreversible record of things that *did* happen

Time is what happens when the first becomes the second. The "now" is the boundary where possibilities become history — a **now-horizon** that advances at a rate governed by the local cost of observation.

The key insight: because [Landauer's principle](https://en.wikipedia.org/wiki/Landauer%27s_principle) ties the cost of each irreversible bit commitment to local temperature, observation is **cheaper in cold environments** and **more expensive in hot ones**. This naturally reproduces relativistic time dilation — time runs slower in gravitational wells not as a geometric axiom, but as a thermodynamic consequence.

## Interactive Visualisations

| Tab | What it shows |
|-----|---------------|
| **Entropy** | Real-time conversion of informational → thermodynamic entropy using cosmological data (Madau-Dickinson star formation rates) |
| **Causal Horizons** | How cosmic expansion prunes possibility space by isolating regions beyond causal contact |
| **CPU** | The computational analogy — the universe as a processor whose clock rate is set by observation cost |
| **Simulation** | Interactive branching simulation — watch possibilities collapse into history |
| **Paper** | The full paper with LaTeX rendering and text-to-speech narration |

## Tech Stack

- **React 19** + **Vite 7** — UI framework
- **Three.js** / **React Three Fiber** — 3D visualisations
- **KaTeX** — LaTeX math rendering
- **Cloudflare Pages** — hosting
- **Cloudflare Workers AI** — text-to-speech for paper narration
- **Cloudflare KV** — TTS audio caching

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build
npm run build

# Preview with Workers AI (TTS)
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

> **Note:** TTS features require Cloudflare Workers AI bindings. Local dev (`npm run dev`) runs everything except narration. Use `npm run dev:full` or `npm run preview` for the full experience with a local Workers runtime.

## Project Structure

```
├── src/
│   ├── App.jsx                          # Main app with tab navigation
│   └── components/
│       ├── Paper.jsx                    # Full paper (markdown + KaTeX + TTS)
│       ├── EntropyVisualization.jsx     # Entropy conversion visualisation
│       ├── CausalHorizonVisualization.jsx  # Causal horizon pruning
│       ├── CPUVisualization.jsx         # Computational analogy
│       └── BranchingSimulation.jsx      # Interactive branching sim
├── functions/
│   └── api/
│       └── tts.js                       # Cloudflare Workers AI TTS endpoint
├── wrangler.toml                        # Cloudflare Pages config
└── index.html
```

## License

This is a theoretical framework and interactive exploration. The ideas are meant to be shared, discussed, and challenged.

---

*"Time is the irreversible conversion of unobserved possibilities into physical records. Its local rate is determined by the thermodynamic cost of observation. Relativity is observation economics."*
