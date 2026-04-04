import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useRef, useMemo, useCallback } from "react";
import * as THREE from "three";

// Observation capacity O(t) following Madau-Dickinson-like curve
// Peaks at "cosmic noon" (t ≈ 0.3), low at Big Bang and Heat Death
function observationCapacity(t) {
  // Early universe: high Landauer cost, low star formation → low O
  // Cosmic noon (t≈0.3): peak star formation, moderate temperature → max O
  // Late universe: declining star formation → declining O
  // Heat death: O → 0, no dissipation channels remain
  const peak = 0.3;
  const earlyFactor = Math.pow(t / peak, 1.5); // Rises from Big Bang
  const lateFactor = Math.pow((1 - t) / (1 - peak), 0.8); // Falls toward heat death
  return Math.min(earlyFactor, 1) * Math.min(lateFactor, 1);
}

function PastParticles({ count, t }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate fixed random positions using seeded PRNG for true randomness
  const particles = useMemo(() => {
    const temp = [];
    const maxCount = 800;
    // Mulberry32 seeded PRNG
    const seededRandom = (seed) => {
      return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    };
    const rand = seededRandom(12345);
    for (let i = 0; i < maxCount; i++) {
      temp.push({
        x: rand() * 2 - 1,
        y: rand() * 2 - 1,
        z: rand() * 2 - 1,
      });
    }
    return temp;
  }, []);

  // Past particles are static - frozen in their observed positions
  useFrame(() => {
    if (!mesh.current || count < 1) return;

    const pastFraction = Math.max(t, 0.01);
    const pastWidth = 8 * pastFraction;
    const pastStart = -4;

    for (let i = 0; i < count; i++) {
      const particle = particles[i];

      // Position within past box - fixed, immutable records
      dummy.position.set(
        pastStart + ((particle.x + 1) / 2) * pastWidth,
        particle.y * 0.8,
        particle.z * 0.8
      );
      dummy.scale.setScalar(0.04);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, Math.max(count, 1)]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ff6600" />
    </instancedMesh>
  );
}

function FutureParticles({ count, t, onDensityUpdate }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useRef(new Float32Array(count * 3));
  // Store world positions for density sampling
  const worldPositions = useRef([]);

  // Generate stable positions using hash-based distribution for true randomness
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      // Use different Knuth multiplicative hash constants for each axis
      const x = ((i * 2654435761) >>> 0) / 4294967296;
      const y = (((i + 1000) * 2246822519) >>> 0) / 4294967296;
      const z = (((i + 2000) * 3266489917) >>> 0) / 4294967296;
      const speedSeed = (((i + 3000) * 1597334677) >>> 0) / 4294967296;
      const offsetSeed = (((i + 4000) * 789456123) >>> 0) / 4294967296;
      temp.push({
        x: x * 2 - 1,
        y: y * 2 - 1,
        z: z * 2 - 1,
        speed: 0.5 + speedSeed * 2,
        offset: offsetSeed * Math.PI * 2,
      });
    }
    return temp;
  }, [count]);

  // Ensure color array is properly sized
  useMemo(() => {
    colorArray.current = new Float32Array(count * 3);
  }, [count]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();

    const futureFraction = Math.max(1 - t, 0.01);
    const futureWidth = 8 * futureFraction;
    const futureStart = -4 + 8 * t;

    // Intensity increases as future shrinks - particles get more excited
    const intensity = 1 / futureFraction;
    const baseChaos = 0.05 + 0.1 * Math.min(intensity - 1, 5);
    const speedMult = 1 + Math.min(intensity - 1, 8);

    const positions = [];

    particles.forEach((particle, i) => {
      // Base position - x is normalized 0-1 within future box, y/z centered
      const normalizedX = (particle.x + 1) / 2; // 0 = near NOW, 1 = far from NOW
      const baseX = futureStart + normalizedX * futureWidth;
      const baseY = particle.y * 0.8;
      const baseZ = particle.z * 0.8;

      // DETERMINISM GRADIENT: Near NOW = more determined (less chaos), Far = less determined (more chaos)
      const freedomFactor = normalizedX;

      // Chaos scales with distance from NOW - more freedom = more chaos
      const localChaos = baseChaos * (0.2 + freedomFactor * 1.5);
      const localSpeed = speedMult * (0.3 + freedomFactor * 1.2);

      // Add chaotic motion that increases with distance from NOW
      const px = baseX + Math.sin(time * particle.speed * localSpeed + particle.offset) * localChaos;
      const py = baseY + Math.cos(time * particle.speed * localSpeed * 0.8 + particle.offset * 1.3) * localChaos;
      const pz = baseZ + Math.sin(time * particle.speed * localSpeed * 0.6 + particle.offset * 0.7) * localChaos;

      dummy.position.set(px, py, pz);
      positions.push({ x: px, y: py, z: pz });

      // Scale: determined particles are smaller/denser, free particles are larger/diffuse
      const baseScale = 0.035 + Math.min(intensity * 0.005, 0.03);
      dummy.scale.setScalar(baseScale * (0.7 + freedomFactor * 0.6));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);

      // Color gradient: cyan (determined, near NOW) -> purple/magenta (free, far from NOW)
      const r = freedomFactor * 0.67;
      const g = 0.67 - freedomFactor * 0.4;
      const b = 1.0;
      colorArray.current[i * 3] = r;
      colorArray.current[i * 3 + 1] = g;
      colorArray.current[i * 3 + 2] = b;
    });

    worldPositions.current = positions;
    if (onDensityUpdate) onDensityUpdate(positions);

    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.geometry.attributes.color) {
      mesh.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colorArray.current, 3]}
        />
      </boxGeometry>
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}

// Deformable Now-Horizon membrane that warps based on local particle density
// Dense regions = high observation cost = membrane lags behind (slower collapse)
// Sparse regions = low cost = membrane pushes forward (faster collapse)
function NowHorizonMembrane({ t, particlePositions }) {
  const meshRef = useRef();
  const gridRes = 20; // subdivisions for y and z
  const basePositions = useRef(null);

  // Create subdivided plane geometry (YZ plane, will displace along X)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2.2, 2.2, gridRes, gridRes);
    // Rotate to face along X axis (plane is in YZ, normal along X)
    geo.rotateY(Math.PI / 2);
    return geo;
  }, [gridRes]);

  // Store the base vertex positions on first render
  useMemo(() => {
    if (geometry) {
      basePositions.current = new Float32Array(geometry.attributes.position.array);
    }
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !basePositions.current) return;
    const time = clock.getElapsedTime();
    const positions = meshRef.current.geometry.attributes.position;
    const base = basePositions.current;
    const nowX = -4 + 8 * t;

    // Sample density: for each vertex, count nearby future particles
    // Use a kernel radius to smooth the density field
    const kernelRadius = 0.6;
    const kernelRadiusSq = kernelRadius * kernelRadius;
    const particles = particlePositions || [];

    for (let i = 0; i < positions.count; i++) {
      // Base positions: x is ~0 (plane center), y and z vary over [-1.1, 1.1]
      const bx = base[i * 3];     // near 0 after rotation
      const by = base[i * 3 + 1]; // -1.1 to 1.1
      const bz = base[i * 3 + 2]; // -1.1 to 1.1

      // World y/z for this vertex
      const wy = by;
      const wz = bz;

      // Count nearby particles (only those close to the horizon in y/z)
      let density = 0;
      for (let p = 0; p < particles.length; p++) {
        const dy = particles[p].y - wy;
        const dz = particles[p].z - wz;
        // Only consider particles near the horizon (within 0.8 units in x)
        const dx = particles[p].x - nowX;
        if (dx > -0.3 && dx < 1.2) {
          const distSq = dy * dy + dz * dz;
          if (distSq < kernelRadiusSq) {
            // Gaussian-ish kernel weight
            density += 1 - (distSq / kernelRadiusSq);
          }
        }
      }

      // Displacement: dense areas push the horizon BACK (positive x = into future = lag)
      // Sparse areas let it push FORWARD (negative x displacement)
      // Normalize density to a reasonable range
      const maxDisplacement = 0.35;
      const normalizedDensity = Math.min(density / 8, 1); // 0-1

      // Displacement: 0 density → push forward, high density → push back
      const displacement = (normalizedDensity - 0.3) * maxDisplacement;

      // Add subtle organic wave for visual life
      const wave = 0.02 * Math.sin(by * 3 + time * 1.5) * Math.cos(bz * 2.5 + time * 1.2);

      positions.array[i * 3] = nowX + displacement + wave;
      positions.array[i * 3 + 1] = by;
      positions.array[i * 3 + 2] = bz;
    }

    positions.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  // Color: create a vertex color buffer that will show density as heat
  const colorAttr = useMemo(() => {
    const count = (gridRes + 1) * (gridRes + 1);
    return new Float32Array(count * 3).fill(1); // init white
  }, [gridRes]);

  useFrame(() => {
    if (!meshRef.current) return;
    const positions = meshRef.current.geometry.attributes.position;
    const colors = meshRef.current.geometry.attributes.color;
    if (!colors) return;
    const nowX = -4 + 8 * t;

    for (let i = 0; i < positions.count; i++) {
      const vertX = positions.array[i * 3];
      // How much is this vertex displaced from the base nowX?
      const disp = vertX - nowX; // positive = lagging (dense), negative = leading (sparse)
      const normalizedDisp = THREE.MathUtils.clamp((disp + 0.35) / 0.7, 0, 1); // 0=leading, 1=lagging

      // Leading (sparse, fast): bright white/cyan
      // Lagging (dense, slow): warm amber/orange — shows resistance
      colors.array[i * 3]     = 0.7 + normalizedDisp * 0.3;  // R
      colors.array[i * 3 + 1] = 1.0 - normalizedDisp * 0.5;  // G
      colors.array[i * 3 + 2] = 1.0 - normalizedDisp * 0.7;  // B
    }
    colors.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial
        vertexColors
        emissive="#ffffff"
        emissiveIntensity={1.5}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        wireframe={false}
      />
      <bufferAttribute
        attach="geometry-attributes-color"
        args={[colorAttr, 3]}
      />
    </mesh>
  );
}

function BigBangSingularity({ visible }) {
  const groupRef = useRef();
  const ringsRef = useRef([]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !visible) return;
    const time = clock.getElapsedTime();

    // Pulse the core
    const pulse = 1 + 0.3 * Math.sin(time * 4);
    groupRef.current.children[0].scale.setScalar(pulse * 0.3);

    // Rotate rings
    ringsRef.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.x = time * (0.5 + i * 0.3);
        ring.rotation.y = time * (0.3 + i * 0.2);
      }
    });
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[-4, 0, 0]}>
      {/* Core singularity */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Glowing rings */}
      {[0.5, 0.7, 0.9].map((size, i) => (
        <mesh key={i} ref={el => ringsRef.current[i] = el}>
          <torusGeometry args={[size, 0.02, 16, 100]} />
          <meshStandardMaterial
            color="#88aaff"
            emissive="#4488ff"
            emissiveIntensity={2 - i * 0.5}
            transparent
            opacity={0.6 - i * 0.15}
          />
        </mesh>
      ))}

      {/* Point light at singularity */}
      <pointLight color="#aaccff" intensity={2} distance={5} />
    </group>
  );
}

// Determinism gradient overlay for the future box
function DeterminismGradient({ t }) {
  const meshRef = useRef();
  const futureFraction = Math.max(1 - t, 0.01);
  const futureWidth = 8 * futureFraction;
  const futureStart = -4 + 8 * t;
  const futureCenter = futureStart + futureWidth / 2;

  // Create gradient texture
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    // Gradient from left (near NOW, determined) to right (far, free/unobserved)
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, 'rgba(0, 170, 255, 0.3)');    // Cyan - observed/determined
    gradient.addColorStop(0.5, 'rgba(100, 100, 255, 0.15)'); // Mid transition
    gradient.addColorStop(1, 'rgba(170, 68, 255, 0.25)');   // Purple - unobserved/free

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Subtle shimmer effect
      const shimmer = 0.95 + 0.1 * Math.sin(clock.getElapsedTime() * 0.5);
      meshRef.current.material.opacity = 0.2 * shimmer;
    }
  });

  if (futureFraction < 0.02) return null;

  return (
    <mesh ref={meshRef} position={[futureCenter, 0, 0]}>
      <boxGeometry args={[futureWidth, 1.95, 1.95]} />
      <meshBasicMaterial
        map={gradientTexture}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function EntropyScene({ t }) {
  const particlePositionsRef = useRef([]);

  const handleDensityUpdate = useCallback((positions) => {
    particlePositionsRef.current = positions;
  }, []);

  const pastFraction = t;
  const futureFraction = 1 - t;
  const futureWidth = 8 * futureFraction;
  const infoEntropyDensity = futureFraction > 0.01 ? 1 / futureFraction : 100;
  const thermoEntropy = t;

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#0066ff" />

      <gridHelper args={[12, 12, "#333", "#222"]} position={[0, -1.5, 0]} />

      {/* Time axis */}
      <mesh position={[0, -1.2, 0]}>
        <boxGeometry args={[8.5, 0.02, 0.02]} />
        <meshBasicMaterial color="#666" />
      </mesh>

      {/* Past volume - observed, irreversible records */}
      {pastFraction > 0.01 && (
        <mesh position={[-4 + 4 * pastFraction, 0, 0]}>
          <boxGeometry args={[8 * pastFraction, 2, 2]} />
          <meshStandardMaterial
            color="#331100"
            emissive="#ff4400"
            emissiveIntensity={0.2 + thermoEntropy * 0.5}
            transparent
            opacity={0.15}
            roughness={0.9}
          />
        </mesh>
      )}

      {/* Past wireframe */}
      {pastFraction > 0.01 && (
        <lineSegments position={[-4 + 4 * pastFraction, 0, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(8 * pastFraction, 2, 2)]} />
          <lineBasicMaterial color="#ff6600" transparent opacity={0.5} />
        </lineSegments>
      )}

      {/* Future volume - unobserved possibilities */}
      {futureFraction > 0.01 && (
        <mesh position={[4 - 4 * futureFraction, 0, 0]}>
          <boxGeometry args={[8 * futureFraction, 2, 2]} />
          <meshStandardMaterial
            color="#001133"
            emissive="#0066ff"
            emissiveIntensity={0.1 + Math.min(infoEntropyDensity * 0.05, 1)}
            transparent
            opacity={0.15}
            roughness={0.7}
          />
        </mesh>
      )}

      {/* Future wireframe */}
      {futureFraction > 0.01 && (
        <lineSegments position={[4 - 4 * futureFraction, 0, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(8 * futureFraction, 2, 2)]} />
          <lineBasicMaterial color="#0088ff" transparent opacity={0.6} />
        </lineSegments>
      )}

      {/* Now-Horizon: deformable membrane that warps with local particle density */}
      {/* Dense regions resist observation → membrane lags. Sparse regions → membrane leads. */}
      <NowHorizonMembrane t={t} particlePositions={particlePositionsRef.current} />

      {/* Big Bang singularity */}
      <BigBangSingularity visible={t < 0.05} />

      {/* Past: observed states - irreversible physical records */}
      {pastFraction > 0.01 && (
        <PastParticles count={Math.floor(600 * pastFraction)} t={t} />
      )}

      {/* Future: unobserved possibilities - informational entropy */}
      {futureFraction > 0.01 && (
        <FutureParticles count={Math.floor(600 * futureFraction)} t={t} onDensityUpdate={handleDensityUpdate} />
      )}

      {/* Determinism gradient: shows how possibilities become observed near NOW */}
      <DeterminismGradient t={t} />

      {/* Labels */}
      {t < 0.05 && (
        <Text
          position={[-4, -1.8, 0]}
          fontSize={0.25}
          color="#aaccff"
          anchorX="center"
        >
          BIG BANG
        </Text>
      )}
      {pastFraction > 0.05 && (
        <Text
          position={[-4 + 4 * pastFraction, -1.8, 0]}
          fontSize={0.25}
          color="#ff8844"
          anchorX="center"
        >
          OBSERVED
        </Text>
      )}
      <Text
        position={[-4 + 8 * pastFraction, -1.8, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
      >
        NOW-HORIZON
      </Text>
      {futureFraction > 0.05 && (
        <Text
          position={[4 - 4 * futureFraction, -1.8, 0]}
          fontSize={0.25}
          color="#44aaff"
          anchorX="center"
        >
          UNOBSERVED
        </Text>
      )}

      {/* Determinism gradient labels */}
      {futureFraction > 0.15 && (
        <>
          <Text
            position={[-4 + 8 * t + futureWidth * 0.12, 1.4, 0]}
            fontSize={0.15}
            color="#00aaff"
            anchorX="center"
          >
            DETERMINED
          </Text>
          <Text
            position={[-4 + 8 * t + futureWidth * 0.88, 1.4, 0]}
            fontSize={0.15}
            color="#aa44ff"
            anchorX="center"
          >
            FREE
          </Text>
          <Text
            position={[4 - 4 * futureFraction, 1.65, 0]}
            fontSize={0.1}
            color="#8888aa"
            anchorX="center"
          >
            ← being observed | yet to be observed →
          </Text>
        </>
      )}
    </>
  );
}

function StatsPanel({ t }) {
  const futureFraction = 1 - t;
  const infoEntropy = futureFraction > 0.01 ? futureFraction : 0;
  const infoEntropyDensity = futureFraction > 0.01 ? 1 / futureFraction : Infinity;
  const thermoEntropy = t;
  const obsCapacity = observationCapacity(t);

  return (
    <div className="stats-panel">
      <h3>Observation-Limited Conversion</h3>

      <div className="stat-row">
        <span className="stat-label">S<sub>info</sub> <small>(unobserved)</small></span>
        <span className="stat-value">{infoEntropy.toFixed(2)}</span>
        <div className="stat-bar">
          <div className="stat-fill info" style={{ width: `${infoEntropy * 100}%` }} />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">S<sub>therm</sub> <small>(observed)</small></span>
        <span className="stat-value">{thermoEntropy.toFixed(2)}</span>
        <div className="stat-bar">
          <div className="stat-fill thermo" style={{ width: `${thermoEntropy * 100}%` }} />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">O(t) <small>(capacity)</small></span>
        <span className="stat-value">{obsCapacity.toFixed(2)}</span>
        <div className="stat-bar">
          <div className="stat-fill capacity" style={{
            width: `${obsCapacity * 100}%`,
            background: 'linear-gradient(90deg, #00ff88, #00aaff)'
          }} />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">Density</span>
        <span className="stat-value">
          {infoEntropyDensity === Infinity ? "∞" : infoEntropyDensity.toFixed(2)}
        </span>
        <div className="stat-bar">
          <div
            className="stat-fill density"
            style={{ width: `${Math.min(infoEntropyDensity / 10 * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="equation">
        dS<sub>info</sub>/dt ∝ −O(t) &nbsp;|&nbsp; O ∝ Ė<sub>diss</sub> / k<sub>B</sub>T
      </div>
    </div>
  );
}

export default function EntropyVisualization({ t, setT }) {
  return (
    <div className="visualization-container">
      <Canvas camera={{ position: [0, 4, 10], fov: 45 }}>
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
        />
        <EntropyScene t={t} />
      </Canvas>

      <div className="controls-overlay">
        <div className="slider-container">
          <label>Cosmic Time</label>
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={t}
            onChange={(e) => setT(parseFloat(e.target.value))}
          />
          <div className="slider-labels">
            <span>Big Bang</span>
            <span>Heat Death</span>
          </div>
        </div>
        <StatsPanel t={t} />
      </div>

      <div className="legend">
        <h4>Physical Records</h4>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>Observed states (irreversible records)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color future"></span>
          <span>Unobserved possibilities</span>
        </div>
        <h4>Determinacy Gradient</h4>
        <div className="legend-item">
          <span className="legend-color determined"></span>
          <span>Near horizon: constrained, nearly determined</span>
        </div>
        <div className="legend-item">
          <span className="legend-color free"></span>
          <span>Far from horizon: free, high S<sub>info</sub></span>
        </div>
        <h4>Local Now-Horizon (Membrane)</h4>
        <div className="legend-note" style={{ marginBottom: '4px' }}>
          The membrane warps with local density — dense regions resist observation and <em>lag behind</em> (Landauer: E ≥ k<sub>B</sub>T ln 2)
        </div>
        <div className="legend-note" style={{ marginBottom: '4px' }}>
          Sparse regions collapse faster → membrane <em>leads</em> — this <b>is</b> gravitational time dilation
        </div>
        <div className="legend-note" style={{ marginBottom: '4px' }}>
          Amber = high observation cost (slow). White/cyan = low cost (fast).
        </div>
        <div className="legend-note">
          Mass = observation resistance. Gravity = cost gradient.
        </div>
        <h4>Regions</h4>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>Past: S<sub>therm</sub> (fixed, zero S<sub>info</sub>)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color future"></span>
          <span>Future: S<sub>info</sub> (shrinking)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color present"></span>
          <span>Now-Horizon: local observation boundary</span>
        </div>
      </div>
    </div>
  );
}
