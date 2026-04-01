import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import * as THREE from "three";

// Seeded random for reproducibility
function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let s = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

// Node statuses
const STATUS = {
  UNOBSERVED: "unobserved", // Future possibilities
  OBSERVED: "observed", // Committed to past
  PRUNED: "pruned", // Causally isolated
  HORIZON: "horizon", // Current now-horizon
};

// Generate a branching tree structure
function generateTree(depth, branchFactor, rand) {
  const nodes = [];
  const edges = [];
  let nodeId = 0;

  // Root node
  nodes.push({
    id: nodeId++,
    depth: 0,
    x: 0,
    y: 0,
    z: 0,
    probability: 1.0,
    status: STATUS.UNOBSERVED,
    children: [],
    parent: null,
  });

  // Generate layers
  for (let d = 0; d < depth; d++) {
    const currentLayer = nodes.filter((n) => n.depth === d);

    currentLayer.forEach((parent) => {
      const numChildren = Math.floor(rand() * branchFactor) + 1;
      const angleStep = (Math.PI * 0.8) / Math.max(numChildren - 1, 1);
      const startAngle = -Math.PI * 0.4;

      for (let i = 0; i < numChildren; i++) {
        const angle = numChildren === 1 ? 0 : startAngle + i * angleStep;
        const childProb = parent.probability / numChildren;

        const child = {
          id: nodeId++,
          depth: d + 1,
          x: parent.x + Math.sin(angle) * 1.5,
          y: parent.y - 1.2,
          z: parent.z + (rand() - 0.5) * 0.5,
          probability: childProb,
          status: STATUS.UNOBSERVED,
          children: [],
          parent: parent.id,
        };

        nodes.push(child);
        parent.children.push(child.id);
        edges.push({ from: parent.id, to: child.id });
      }
    });
  }

  return { nodes, edges };
}

// Calculate observation capacity (Madau-Dickinson curve)
function observationCapacity(t) {
  const peak = 0.3;
  const earlyFactor = Math.pow(t / peak, 1.5);
  const lateFactor = Math.pow((1 - t) / (1 - peak), 0.8);
  return Math.min(earlyFactor, 1) * Math.min(lateFactor, 1);
}

// Tree nodes visualization
function TreeNodes({ nodes, observedPath }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = nodes.length;

  const colors = useMemo(() => {
    const colorArray = new Float32Array(count * 3);
    return colorArray;
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;

    nodes.forEach((node, i) => {
      dummy.position.set(node.x, node.y, node.z);

      let scale = 0.15;
      let color = new THREE.Color("#0088ff"); // Unobserved - blue

      if (node.status === STATUS.OBSERVED) {
        color = new THREE.Color("#ff6600"); // Observed - orange
        scale = 0.18;
      } else if (node.status === STATUS.HORIZON) {
        color = new THREE.Color("#ffffff"); // Horizon - white
        scale = 0.25;
      } else if (node.status === STATUS.PRUNED) {
        color = new THREE.Color("#333333"); // Pruned - dark gray
        scale = 0.08;
      }

      // Highlight observed path
      if (observedPath.includes(node.id) && node.status === STATUS.OBSERVED) {
        scale = 0.2;
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 16, 16]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </sphereGeometry>
      <meshStandardMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}

// Tree edges visualization
function TreeEdges({ nodes, edges }) {
  const linesRef = useRef();

  const linePositions = useMemo(() => {
    const positions = [];
    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      if (fromNode && toNode) {
        positions.push(fromNode.x, fromNode.y, fromNode.z);
        positions.push(toNode.x, toNode.y, toNode.z);
      }
    });
    return new Float32Array(positions);
  }, [nodes, edges]);

  const lineColors = useMemo(() => {
    const colors = [];
    edges.forEach((edge) => {
      const toNode = nodes.find((n) => n.id === edge.to);
      let color = new THREE.Color("#0066aa");

      if (toNode) {
        if (toNode.status === STATUS.OBSERVED) {
          color = new THREE.Color("#ff8844");
        } else if (toNode.status === STATUS.PRUNED) {
          color = new THREE.Color("#222222");
        }
      }

      // Both vertices get same color
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
    });
    return new Float32Array(colors);
  }, [nodes, edges]);

  useFrame(() => {
    if (linesRef.current) {
      // Update colors based on current node states
      edges.forEach((edge, i) => {
        const toNode = nodes.find((n) => n.id === edge.to);
        let color = new THREE.Color("#0066aa");

        if (toNode) {
          if (toNode.status === STATUS.OBSERVED) {
            color = new THREE.Color("#ff8844");
          } else if (toNode.status === STATUS.PRUNED) {
            color = new THREE.Color("#222222");
          }
        }

        lineColors[i * 6] = color.r;
        lineColors[i * 6 + 1] = color.g;
        lineColors[i * 6 + 2] = color.b;
        lineColors[i * 6 + 3] = color.r;
        lineColors[i * 6 + 4] = color.g;
        lineColors[i * 6 + 5] = color.b;
      });
      linesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={linePositions.length / 3}
          array={linePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={lineColors.length / 3}
          array={lineColors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.6} />
    </lineSegments>
  );
}

// Heat particles rising from observed nodes
function HeatParticles({ nodes, heatLevel }) {
  const count = 100;
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    const rand = seededRandom(12345);
    for (let i = 0; i < count; i++) {
      temp.push({
        offset: rand() * Math.PI * 2,
        speed: 0.3 + rand() * 0.5,
        radius: 0.1 + rand() * 0.2,
      });
    }
    return temp;
  }, []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();
    const observedNodes = nodes.filter((n) => n.status === STATUS.OBSERVED);
    const visibleCount = Math.min(
      Math.floor(count * heatLevel),
      observedNodes.length * 5
    );

    particles.forEach((particle, i) => {
      if (i < visibleCount && observedNodes.length > 0) {
        const sourceNode = observedNodes[i % observedNodes.length];
        const yOffset = ((time * particle.speed + particle.offset) % 2) * 1;

        dummy.position.set(
          sourceNode.x +
            Math.sin(time * particle.speed + particle.offset) * particle.radius,
          sourceNode.y + yOffset,
          sourceNode.z +
            Math.cos(time * particle.speed + particle.offset) * particle.radius
        );
        dummy.scale.setScalar(0.03 * (1 - yOffset / 2));
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
      }

      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ff4400" transparent opacity={0.5} />
    </instancedMesh>
  );
}

// Now-horizon plane indicator
function NowHorizonPlane({ horizonY }) {
  return (
    <mesh position={[0, horizonY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12, 8]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Main scene
function SimulationScene({ nodes, edges, observedPath, horizonY, heatLevel }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#aabbff" />

      <TreeNodes nodes={nodes} observedPath={observedPath} />
      <TreeEdges nodes={nodes} edges={edges} />
      <HeatParticles nodes={nodes} heatLevel={heatLevel} />
      <NowHorizonPlane horizonY={horizonY} />

      {/* Labels */}
      <Text position={[0, 1.5, 0]} fontSize={0.15} color="#0088ff">
        UNOBSERVED
      </Text>
      <Text position={[0, 1.2, 0]} fontSize={0.08} color="#666">
        (S_info: possible futures)
      </Text>

      <Text position={[-4, horizonY, 0]} fontSize={0.12} color="#ffffff">
        NOW-HORIZON
      </Text>

      <Text position={[0, -6, 0]} fontSize={0.15} color="#ff6600">
        OBSERVED
      </Text>
      <Text position={[0, -6.3, 0]} fontSize={0.08} color="#666">
        (S_therm: irreversible past)
      </Text>
    </>
  );
}

// Stats panel component
function StatsPanel({
  sInfo,
  sTherm,
  totalNodes,
  prunedCount,
  observationRate,
}) {
  const landauerCost = sTherm * 0.017; // eV per bit observed

  return (
    <div className="stats-panel">
      <h3>Dual Entropy Bookkeeping</h3>

      <div className="stat-row">
        <span className="stat-label">
          S<sub>info</sub> <small>(unobserved)</small>
        </span>
        <span className="stat-value">{sInfo}</span>
        <div className="stat-bar">
          <div
            className="stat-fill info"
            style={{ width: `${(sInfo / Math.max(totalNodes, 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">
          S<sub>therm</sub> <small>(observed)</small>
        </span>
        <span className="stat-value">{sTherm}</span>
        <div className="stat-bar">
          <div
            className="stat-fill thermo"
            style={{ width: `${(sTherm / Math.max(totalNodes, 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">
          Pruned <small>(isolated)</small>
        </span>
        <span className="stat-value">{prunedCount}</span>
        <div className="stat-bar">
          <div
            className="stat-fill density"
            style={{
              width: `${(prunedCount / Math.max(totalNodes, 1)) * 100}%`,
              background: "#666",
            }}
          />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">
          O(t) <small>(obs. capacity)</small>
        </span>
        <span className="stat-value">{(observationRate * 100).toFixed(0)}%</span>
        <div className="stat-bar">
          <div
            className="stat-fill"
            style={{
              width: `${observationRate * 100}%`,
              background: "linear-gradient(90deg, #0066ff, #00ff88)",
            }}
          />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">
          Heat <small>(Landauer)</small>
        </span>
        <span className="stat-value">{landauerCost.toFixed(2)} eV</span>
      </div>

      <div className="equation">S_info → S_therm + Q (irreversible)</div>
    </div>
  );
}

// Controls panel
function ControlsPanel({
  isRunning,
  setIsRunning,
  speed,
  setSpeed,
  branchFactor,
  setBranchFactor,
  treeDepth,
  setTreeDepth,
  onReset,
  preset,
  setPreset,
}) {
  return (
    <div className="controls-panel">
      <div className="control-group">
        <button
          className={`control-btn ${isRunning ? "active" : ""}`}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? "⏸ Pause" : "▶ Play"}
        </button>
        <button className="control-btn" onClick={onReset}>
          ↺ Reset
        </button>
      </div>

      <div className="slider-group">
        <label>Observation Speed</label>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
        />
      </div>

      <div className="slider-group">
        <label>Branch Factor: {branchFactor}</label>
        <input
          type="range"
          min={2}
          max={5}
          step={1}
          value={branchFactor}
          onChange={(e) => setBranchFactor(parseInt(e.target.value))}
        />
      </div>

      <div className="slider-group">
        <label>Tree Depth: {treeDepth}</label>
        <input
          type="range"
          min={3}
          max={7}
          step={1}
          value={treeDepth}
          onChange={(e) => setTreeDepth(parseInt(e.target.value))}
        />
      </div>

      <div className="preset-group">
        <label>Narrative Mode</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          <option value="baseline">Baseline</option>
          <option value="cosmic-noon">Cosmic Noon</option>
          <option value="heat-death">Heat Death</option>
          <option value="accelerating">Accelerating Expansion</option>
        </select>
      </div>
    </div>
  );
}

export default function BranchingSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [branchFactor, setBranchFactor] = useState(3);
  const [treeDepth, setTreeDepth] = useState(5);
  const [preset, setPreset] = useState("baseline");
  const [simulationTime, setSimulationTime] = useState(0);
  const [seed, setSeed] = useState(42);

  // Generate tree
  const { nodes, edges, observedPath, horizonY, stats } = useMemo(() => {
    const rand = seededRandom(seed);
    const tree = generateTree(treeDepth, branchFactor, rand);

    // Apply simulation state based on time
    const normalizedTime = Math.min(simulationTime / 10, 1);
    const currentDepth = Math.floor(normalizedTime * treeDepth);

    // Calculate observation capacity based on preset
    let obsCapacity = observationCapacity(normalizedTime);
    if (preset === "cosmic-noon") {
      obsCapacity = Math.min(obsCapacity * 1.5, 1);
    } else if (preset === "heat-death") {
      obsCapacity = obsCapacity * 0.3;
    } else if (preset === "accelerating") {
      obsCapacity = obsCapacity * (1 - normalizedTime * 0.5);
    }

    // Track the observed path (one branch selected at each level)
    const pathRand = seededRandom(seed + 1);
    const path = [];
    let currentNode = tree.nodes[0];
    path.push(currentNode.id);

    while (currentNode.children.length > 0 && currentNode.depth < currentDepth) {
      // Select one child to observe (weighted by probability and observation capacity)
      const childIndex = Math.floor(pathRand() * currentNode.children.length);
      const childId = currentNode.children[childIndex];
      currentNode = tree.nodes.find((n) => n.id === childId);
      if (currentNode) {
        path.push(currentNode.id);
      }
    }

    // Update node statuses
    let sInfo = 0;
    let sTherm = 0;
    let prunedCount = 0;

    tree.nodes.forEach((node) => {
      if (node.depth < currentDepth) {
        if (path.includes(node.id)) {
          node.status = STATUS.OBSERVED;
          sTherm++;
        } else {
          node.status = STATUS.PRUNED;
          prunedCount++;
        }
      } else if (node.depth === currentDepth) {
        if (path.includes(node.id)) {
          node.status = STATUS.HORIZON;
        } else {
          // Check if parent is on path
          const parent = tree.nodes.find((n) => n.id === node.parent);
          if (parent && path.includes(parent.id)) {
            node.status = STATUS.UNOBSERVED;
            sInfo++;
          } else {
            node.status = STATUS.PRUNED;
            prunedCount++;
          }
        }
      } else {
        // Future nodes - check if ancestor is on path
        let ancestor = tree.nodes.find((n) => n.id === node.parent);
        let isReachable = false;
        while (ancestor) {
          if (path.includes(ancestor.id) || ancestor.status === STATUS.HORIZON) {
            isReachable = true;
            break;
          }
          if (ancestor.status === STATUS.PRUNED) {
            break;
          }
          ancestor = tree.nodes.find((n) => n.id === ancestor.parent);
        }

        if (isReachable) {
          node.status = STATUS.UNOBSERVED;
          sInfo++;
        } else {
          node.status = STATUS.PRUNED;
          prunedCount++;
        }
      }
    });

    // Calculate horizon Y position
    const horizonNodes = tree.nodes.filter((n) => n.status === STATUS.HORIZON);
    const avgHorizonY =
      horizonNodes.length > 0
        ? horizonNodes.reduce((sum, n) => sum + n.y, 0) / horizonNodes.length
        : 0;

    return {
      nodes: tree.nodes,
      edges: tree.edges,
      observedPath: path,
      horizonY: avgHorizonY,
      stats: {
        sInfo,
        sTherm,
        totalNodes: tree.nodes.length,
        prunedCount,
        observationRate: obsCapacity,
      },
    };
  }, [seed, treeDepth, branchFactor, simulationTime, preset]);

  // Animation loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSimulationTime((t) => {
        const newT = t + 0.05 * speed;
        if (newT >= 10) {
          setIsRunning(false);
          return 10;
        }
        return newT;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, speed]);

  // Reset function
  const handleReset = useCallback(() => {
    setSimulationTime(0);
    setIsRunning(false);
    setSeed((s) => s + 1); // New random tree
  }, []);

  return (
    <div className="visualization-container simulation-visualization">
      <Canvas camera={{ position: [0, -2, 12], fov: 50 }}>
        <OrbitControls enablePan={true} minDistance={5} maxDistance={25} />
        <SimulationScene
          nodes={nodes}
          edges={edges}
          observedPath={observedPath}
          horizonY={horizonY}
          heatLevel={stats.sTherm / Math.max(stats.totalNodes, 1)}
        />
      </Canvas>

      <div className="controls-overlay">
        <div className="slider-container">
          <label>Simulation Time</label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={simulationTime}
            onChange={(e) => setSimulationTime(parseFloat(e.target.value))}
          />
          <div className="slider-labels">
            <span>t=0</span>
            <span>t=∞</span>
          </div>
        </div>

        <ControlsPanel
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          speed={speed}
          setSpeed={setSpeed}
          branchFactor={branchFactor}
          setBranchFactor={setBranchFactor}
          treeDepth={treeDepth}
          setTreeDepth={setTreeDepth}
          onReset={handleReset}
          preset={preset}
          setPreset={setPreset}
        />

        <StatsPanel
          sInfo={stats.sInfo}
          sTherm={stats.sTherm}
          totalNodes={stats.totalNodes}
          prunedCount={stats.prunedCount}
          observationRate={stats.observationRate}
        />
      </div>

      <div className="legend">
        <h4>Branching Tree Model</h4>
        <div className="legend-note" style={{ marginBottom: "8px" }}>
          Observation-limited entropy conversion
        </div>
        <div className="legend-item">
          <span className="legend-color future"></span>
          <span>
            Unobserved (S<sub>info</sub>)
          </span>
        </div>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>
            Observed (S<sub>therm</sub>)
          </span>
        </div>
        <div className="legend-item">
          <span className="legend-color present"></span>
          <span>Now-horizon</span>
        </div>
        <div className="legend-item">
          <span
            className="legend-color"
            style={{ background: "#333" }}
          ></span>
          <span>Pruned (causally isolated)</span>
        </div>

        <h4 style={{ marginTop: "12px" }}>Mechanisms</h4>
        <div className="legend-note">
          1. Observation: S<sub>info</sub> → S<sub>therm</sub> + heat
        </div>
        <div className="legend-note">
          2. Pruning: unreachable branches removed
        </div>
        <h4 style={{ marginTop: "12px" }}>Topology of Collapse</h4>
        <div className="legend-note">
          High-probability branches collapse first (cheaper). Low-probability branches persist as unresolved S<sub>info</sub>.
        </div>
        <div className="legend-note">
          Mass = informational complexity (observation resistance). Gravity = cost gradient across branches.
        </div>
      </div>
    </div>
  );
}
