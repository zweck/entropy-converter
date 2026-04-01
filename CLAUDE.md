# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Time as Entropy Conversion** - An interactive visualization exploring the relationship between time, entropy, and quantum mechanics. Three synchronized visualizations plus an academic paper, all controlled by a unified time parameter `t` (0 = Big Bang → 1 = Heat Death).

## Commands

```bash
npm run dev          # Development server with HMR (localhost:5173)
npm run build        # Production build to dist/
npm run lint         # ESLint check
npm run preview      # Preview production build with Cloudflare Workers AI
npm run dev:full     # Build + Cloudflare Pages dev with AI binding
npm run deploy       # Build and deploy to Cloudflare Pages
```

For TTS functionality, use `dev:full` or `preview` (requires Cloudflare Workers AI).

## Architecture

### Component Structure

```
App.jsx
├── Tab Navigation (entropy/horizon/cpu/paper)
├── Time Slider (shared `t` parameter 0-1)
└── Visualization Components
    ├── EntropyVisualization  - 3D Three.js: past/future particle boxes
    ├── CausalHorizonVisualization - 2D Canvas: quantum branching tree
    ├── CPUVisualization      - 3D Three.js: instruction execution metaphor
    └── Paper                 - Markdown + TTS audio player
```

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

`functions/api/tts.js` - Cloudflare Workers function for text-to-speech:
- Uses `@cf/deepgram/aura-2-en` model
- SHA-256 hash-based cache invalidation
- KV storage keyed by `audio:{paperHash}:{section}`

## Physics Rules for Visualizations

- **Future particles never decrease** - they only get more excited (increased chaos/velocity) as informational entropy collapses
- Informational entropy collapse into immutable past forces higher thermodynamic entropy (heat death)
- Particles are only visible in the boxes at certain viewing angles
- Causal horizon separation prunes branches requiring causally-disconnected observer pairs
