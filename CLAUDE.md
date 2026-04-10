# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Time as Entropy Conversion** - An interactive visualization exploring the relationship between time, entropy, and quantum mechanics. Multiple synchronized visualizations plus an academic paper, with the three time-driven visualizations sharing a unified parameter `t` (0 = Big Bang → 1 = Heat Death).

## Commands

```bash
npm start            # Alias for `npm run dev`
npm run dev          # Vite dev server with HMR (localhost:5173) — no AI/KV bindings
npm run dev:full     # Build + `wrangler pages dev` with AI binding (for TTS)
npm run dev:watch    # Concurrent `vite build --watch` + wrangler on port 8788
npm run build        # Production build to dist/
npm run lint         # ESLint check
npm run preview      # Serve built dist/ with `wrangler pages dev --ai`
npm run deploy       # Build and deploy to Cloudflare Pages
```

TTS only works under `dev:full` / `dev:watch` / `preview` (the plain `dev` has no AI binding). Note that `wrangler pages dev --ai` gets the AI binding but **not** KV — the KV namespace `TTS_CACHE` is declared only under `[env.production]` in `wrangler.toml`, so TTS caching silently no-ops in local dev and every request re-generates audio.

## Architecture

### Component Structure

`App.jsx` owns two pieces of state: `activeTab` and `t`. It has seven tabs:

```
App.jsx (useState: activeTab, t)
├── entropy    → EntropyVisualization        (t, setT)  — 3D Three.js past/future particle boxes
├── horizons   → CausalHorizonVisualization  (t, setT)  — 2D canvas quantum branching tree
├── cpu        → CPUVisualization            (t, setT)  — 3D Three.js instruction execution metaphor
├── simulation → BranchingSimulation         (no t)     — standalone interactive branching collapse
├── sparc      → SPARCResults                (no t)     — static SPARC galaxy validation panel
├── kids       → KiDSResults                 (no t)     — static KiDS-1000 weak lensing validation panel
└── paper      → Paper                       (no t)     — embedded markdown + TTS audio player
```

Architectural notes worth knowing before editing:

- **Only three tabs share `t`** (`entropy`, `horizons`, `cpu`). They all receive `setT` too, so scrubbing a slider inside any of them updates the others when you switch tabs. `simulation`, `sparc`, `kids`, and `paper` are self-contained.
- **Components are large and self-contained** (`Paper.jsx` 864 lines, `BranchingSimulation.jsx` 749, `EntropyVisualization.jsx` 731). There's no shared state store and no router despite `react-router-dom` being a dependency — navigation is the single `activeTab` `useState` in `App.jsx`. Editing one visualization rarely touches the others.
- **Paper content is embedded as a JS string inside `Paper.jsx`**, not loaded from `public/paper.tex`. That `.tex` file is only served as a user-facing download link.

### Key Concepts

- **Time `t`**: Unified parameter controlling all visualizations (0→1)
- **Past (orange)**: Collapsed states, immutable, thermodynamic entropy
- **Future (cyan→purple)**: Possible states, shrinking as `t` increases
- **Present frontier**: The "NOW" line where collapse occurs

### Tech Stack

- React 19 + Vite 7
- Three.js + React Three Fiber + Drei (3D graphics)
- React Markdown + KaTeX (paper rendering)
- Cloudflare Pages + Workers AI (deployment, TTS)
- Cloudflare KV (TTS audio caching)

### Backend

`functions/api/tts.js` — Cloudflare Pages Function for text-to-speech:
- Uses the `@cf/deepgram/aura-2-en` Workers AI model.
- `paperHash` is a SHA-256 computed client-side in `Paper.jsx` over the full paper string and sent with every request. When the server sees a new `paperHash`, it clears **all** KV keys before caching — any edit to the embedded paper text invalidates the entire audio cache on next request.
- KV storage keyed by `audio:{paperHash}:{sectionIndex}`, with a 30-day `expirationTtl` as a fallback cleanup.
- Binding name: `TTS_CACHE` (production only, see `wrangler.toml`).

## Physics Rules for Visualizations

- **Shared `t` is a single scalar in `[0, 1]`** held in `App.jsx` and passed to the three time-driven viz components along with `setT`. Any of them can drive the slider; keep them in sync through `t`, not local state.
- **Future particles never decrease** — they only get more excited (increased chaos/velocity) as informational entropy collapses.
- Informational entropy collapse into the immutable past forces higher thermodynamic entropy (heat death).
- Particles are only visible inside the boxes at certain viewing angles.
- Causal horizon separation prunes branches requiring causally-disconnected observer pairs.
