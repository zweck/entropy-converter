import { useRef, useEffect, useMemo } from "react";

// Horizon pairs that can separate
// Thresholds calculated so furthest pairs separate first, adjacent pairs separate at t=1 (heat death)
// With 40px spacing, 70px radius (touch at 140px), expansion rate 2.5:
// - Adjacent (40px apart): separate at t=1.0
// - Skip-one (80px apart): separate at t=0.30
// - Opposite (120px apart): separate at t=0.07
const HORIZON_PAIRS = [
  { id: 0, name: "A-D", color: "#ff00aa", threshold: 0.07 },  // Furthest - separates first
  { id: 1, name: "A-C", color: "#00ffaa", threshold: 0.30 },
  { id: 2, name: "B-D", color: "#aa00ff", threshold: 0.30 },
  { id: 3, name: "A-B", color: "#00aaff", threshold: 0.97 },  // Adjacent - separates at heat death
  { id: 4, name: "B-C", color: "#ffaa00", threshold: 0.97 },
  { id: 5, name: "C-D", color: "#ff5500", threshold: 0.97 },
];

// Tree node structure representing possible futures
// Use seeded random for consistent results
let seed = 12345;
function seededRandom() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function generateTree(depth, branchFactor = 2, parentId = "root", inheritedPair = null) {
  if (depth === 0) return [];

  const nodes = [];
  for (let i = 0; i < branchFactor; i++) {
    const id = `${parentId}-${i}`;

    // Weighted distribution: adjacent pairs (indices 3,4,5) are more likely
    // This ensures branches survive until near heat death
    // Weights: A-D(0): 1, A-C(1): 2, B-D(2): 2, A-B(3): 5, B-C(4): 5, C-D(5): 5
    let pairIndex;
    if (inheritedPair !== null && seededRandom() > 0.5) {
      pairIndex = inheritedPair;
    } else {
      const r = seededRandom() * 20; // Total weight = 1+2+2+5+5+5 = 20
      if (r < 1) pairIndex = 0;       // A-D (5%)
      else if (r < 3) pairIndex = 1;  // A-C (10%)
      else if (r < 5) pairIndex = 2;  // B-D (10%)
      else if (r < 10) pairIndex = 3; // A-B (25%)
      else if (r < 15) pairIndex = 4; // B-C (25%)
      else pairIndex = 5;             // C-D (25%)
    }

    const node = {
      id,
      children: generateTree(depth - 1, branchFactor, id, pairIndex),
      horizonPair: pairIndex,
    };
    nodes.push(node);
  }
  return nodes;
}

// Calculate tree layout positions
function layoutTree(nodes, x, y, width, depth = 0, positions = {}) {
  const verticalSpacing = 50;
  const nodeCount = nodes.length;

  nodes.forEach((node, i) => {
    const nodeWidth = width / nodeCount;
    const nodeX = x + nodeWidth * i + nodeWidth / 2;
    const nodeY = y + verticalSpacing;

    positions[node.id] = {
      x: nodeX,
      y: nodeY,
      depth,
      horizonPair: node.horizonPair,
      parentId: node.id.split('-').slice(0, -1).join('-') || 'root'
    };

    if (node.children.length > 0) {
      layoutTree(node.children, x + nodeWidth * i, nodeY, nodeWidth, depth + 1, positions);
    }
  });

  return positions;
}

export default function CausalHorizonVisualization({ t, setT }) {
  const canvasRef = useRef(null);

  // Generate tree structure once (reset seed for consistency)
  const tree = useMemo(() => {
    seed = 12345;
    return generateTree(5, 2);
  }, []);

  // Calculate layout - tree is in bottom portion
  const positions = useMemo(() => {
    const pos = { root: { x: 400, y: 200, depth: -1, horizonPair: -1, parentId: null } };
    layoutTree(tree, 100, 200, 600, 0, pos);
    return pos;
  }, [tree]);

  // Calculate which horizon pairs are separated based on t
  const separatedPairs = useMemo(() => {
    const separated = new Set();
    HORIZON_PAIRS.forEach(pair => {
      if (t > pair.threshold) {
        separated.add(pair.id);
      }
    });
    return separated;
  }, [t]);

  // Calculate pruned branches based on separated horizon pairs
  const prunedBranches = useMemo(() => {
    const pruned = new Set();

    Object.keys(positions).forEach(nodeId => {
      if (nodeId === 'root') return;
      const node = positions[nodeId];

      // Branch is pruned if its required horizon pair is separated
      if (separatedPairs.has(node.horizonPair)) {
        pruned.add(nodeId);
      }

      // Also pruned if parent is pruned
      if (node.parentId !== 'root' && pruned.has(node.parentId)) {
        pruned.add(nodeId);
      }
    });

    return pruned;
  }, [positions, separatedPairs]);

  // Animation and drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, width, height);

    // === DRAW CAUSAL HORIZONS (top section) ===
    const horizonY = 90;
    const horizonRadius = 70;
    // Start observers 40px apart so all circles overlap initially
    // At t=1, adjacent pairs will be 140px apart (just separated with radius 70)
    const observers = [
      { id: 'A', x: 355, y: horizonY },
      { id: 'B', x: 395, y: horizonY },
      { id: 'C', x: 435, y: horizonY },
      { id: 'D', x: 475, y: horizonY },
    ];

    // Expansion factor calibrated so adjacent circles (40px) reach 140px at t=1
    // 40 * 3.5 = 140, so expansion = 1 + t * 2.5 gives 3.5 at t=1
    const expansion = 1 + t * 2.5;

    // Draw title
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAUSAL HORIZONS (Geometric Pruning Mechanism)', width / 2, 20);

    // Draw observer positions (expanded outward from center)
    const expandedObservers = observers.map((obs) => {
      const centerX = 415;  // Center of the 4 observers
      const offsetX = (obs.x - centerX) * expansion;
      return { ...obs, expandedX: centerX + offsetX };
    });

    // Draw connections between observers
    for (let i = 0; i < expandedObservers.length; i++) {
      for (let j = i + 1; j < expandedObservers.length; j++) {
        const obs1 = expandedObservers[i];
        const obs2 = expandedObservers[j];
        const dist = Math.abs(obs2.expandedX - obs1.expandedX);
        const canConnect = dist < horizonRadius * 2;

        // Find the pair
        const pairName = `${obs1.id}-${obs2.id}`;
        const pair = HORIZON_PAIRS.find(p => p.name === pairName);

        if (pair) {
          const isSeparated = separatedPairs.has(pair.id);

          if (canConnect && !isSeparated) {
            // Connected - draw solid line
            ctx.strokeStyle = pair.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.globalAlpha = 0.8;
          } else {
            // Separated - draw faded dashed line (causally unreachable)
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.globalAlpha = 0.3;
          }

          ctx.beginPath();
          ctx.moveTo(obs1.expandedX, obs1.y);
          ctx.lineTo(obs2.expandedX, obs2.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.setLineDash([]);
        }
      }
    }

    // Draw causal horizon circles
    expandedObservers.forEach((obs) => {
      // Horizon circle (fixed size - speed of light constraint)
      ctx.beginPath();
      ctx.arc(obs.expandedX, obs.y, horizonRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#0066aa';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 100, 170, 0.1)';
      ctx.fill();

      // Observer dot
      ctx.beginPath();
      ctx.arc(obs.expandedX, obs.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#00aaff';
      ctx.fill();

      // Label
      ctx.fillStyle = '#00aaff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(obs.id, obs.expandedX, obs.y - horizonRadius - 10);
    });

    // Draw expansion arrows
    if (t > 0.05) {
      ctx.fillStyle = '#ff6600';
      ctx.font = '10px monospace';
      ctx.fillText('← SPACE EXPANDING →', width / 2, horizonY + horizonRadius + 25);
    }

    // === DRAW SEPARATOR ===
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(50, 170);
    ctx.lineTo(width - 50, 170);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('↓ POSSIBLE FUTURES (branches require causal connectivity) ↓', width / 2, 185);

    // === DRAW TREE (bottom section) ===

    // Draw connections first
    Object.keys(positions).forEach(nodeId => {
      if (nodeId === 'root') return;

      const node = positions[nodeId];
      const parentId = node.parentId;
      const parent = positions[parentId];

      if (!parent) return;

      const pair = HORIZON_PAIRS[node.horizonPair];
      const isPruned = prunedBranches.has(nodeId);
      const parentPruned = parentId !== 'root' && prunedBranches.has(parentId);

      if (isPruned || parentPruned) {
        // Pruned branch - causally unreachable future
        ctx.strokeStyle = 'rgba(255, 68, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);

        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        // Draw partial broken line
        const breakRatio = 0.35;
        const breakX = parent.x + (node.x - parent.x) * breakRatio;
        const breakY = parent.y + (node.y - parent.y) * breakRatio;
        ctx.lineTo(breakX, breakY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Active connection - colored by horizon pair
        ctx.strokeStyle = pair ? pair.color : '#888';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // Draw nodes
    Object.keys(positions).forEach(nodeId => {
      const node = positions[nodeId];
      const isPruned = prunedBranches.has(nodeId);
      const isRoot = nodeId === 'root';

      if (isPruned && !isRoot) return; // Don't draw pruned nodes

      const pair = HORIZON_PAIRS[node.horizonPair];
      const radius = isRoot ? 8 : Math.max(3, 5 - node.depth * 0.5);

      if (isRoot) {
        // Root node - "Now-Horizon"
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00ffaa';
        ctx.fill();

        ctx.fillStyle = '#00ffaa';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NOW-HORIZON', node.x, node.y - 12);
      } else {
        // Future node - colored by required horizon pair
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = pair ? pair.color : '#888';
        ctx.fill();
      }
    });

    // === DRAW LEGEND (horizon pairs) ===
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Observer Pairs:', 20, height - 80);

    HORIZON_PAIRS.forEach((pair, i) => {
      const x = 20 + (i % 3) * 90;
      const y = height - 60 + Math.floor(i / 3) * 18;
      const isSeparated = separatedPairs.has(pair.id);

      ctx.fillStyle = isSeparated ? '#ff4400' : pair.color;
      ctx.fillRect(x, y - 8, 10, 10);

      ctx.fillStyle = isSeparated ? '#666' : '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(`${pair.name}${isSeparated ? ' ✕' : ''}`, x + 14, y);
    });

    // Stats
    const totalBranches = Object.keys(positions).length - 1;
    const activeBranches = totalBranches - prunedBranches.size;

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Reachable: ${activeBranches} | Unreachable: ${prunedBranches.size}`, width - 20, height - 20);

  }, [positions, t, separatedPairs, prunedBranches]);

  // Calculate stats for panel
  const stats = useMemo(() => {
    const total = Object.keys(positions).length - 1;
    const pruned = prunedBranches.size;
    const active = total - pruned;
    const separated = separatedPairs.size;
    return { total, pruned, active, separated };
  }, [positions, prunedBranches, separatedPairs]);

  return (
    <div className="visualization-container causal-horizon-viz">
      <div className="canvas-wrapper" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        background: '#0a0a12'
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px'
          }}
        />
      </div>

      <div className="controls-overlay">
        {setT && (
          <div className="slider-container">
            <label>Cosmic Expansion</label>
            <input
              type="range"
              min={0}
              max={0.99}
              step={0.01}
              value={t}
              onChange={(e) => setT(parseFloat(e.target.value))}
            />
            <div className="slider-labels">
              <span>Early Universe</span>
              <span>Heat Death</span>
            </div>
          </div>
        )}

        <div className="stats-panel">
          <h3>Horizon Isolation</h3>
          <p className="stat-subtitle">Second mechanism of S<sub>info</sub> reduction</p>

          <div className="stat-row">
            <span className="stat-label">Causal Links</span>
            <span className="stat-value">{6 - stats.separated}/6</span>
            <div className="stat-bar">
              <div className="stat-fill info" style={{ width: `${((6 - stats.separated) / 6) * 100}%` }} />
            </div>
          </div>

          <div className="stat-row">
            <span className="stat-label">Reachable Futures</span>
            <span className="stat-value">{stats.active}</span>
            <div className="stat-bar">
              <div className="stat-fill info" style={{ width: `${(stats.active / stats.total) * 100}%` }} />
            </div>
          </div>

          <div className="stat-row">
            <span className="stat-label">Pruned (Unreachable)</span>
            <span className="stat-value">{stats.pruned}</span>
            <div className="stat-bar">
              <div className="stat-fill thermo" style={{ width: `${(stats.pruned / stats.total) * 100}%` }} />
            </div>
          </div>

          <div className="equation">
            Horizons isolate → futures pruned → S<sub>info</sub> ↓
          </div>
        </div>
      </div>

      <div className="legend horizon-legend">
        <h4>Two Mechanisms</h4>
        <div className="legend-note" style={{ marginBottom: '8px' }}>
          S<sub>info</sub> is reduced by:
        </div>
        <div className="legend-item">
          <span className="legend-color present"></span>
          <span>1. Observation (local collapse)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>2. Horizon isolation (geometric)</span>
        </div>
        <h4>Causality</h4>
        <div className="legend-item">
          <span className="legend-color future"></span>
          <span>Connected horizons</span>
        </div>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>Separated (causally unreachable)</span>
        </div>
        <div className="legend-note">
          Expansion increases volume but contracts effective future
        </div>
        <h4>Dark Matter Connection</h4>
        <div className="legend-note">
          Informationally complex regions create observation-cost gradients (gravity) without baryonic matter — dark matter as informational structure
        </div>
      </div>
    </div>
  );
}
