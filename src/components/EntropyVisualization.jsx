import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

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

  // Past particles are static - frozen in their collapsed positions
  useFrame(() => {
    if (!mesh.current || count < 1) return;

    const pastFraction = Math.max(t, 0.01);
    const pastWidth = 8 * pastFraction;
    const pastStart = -4;

    for (let i = 0; i < count; i++) {
      const particle = particles[i];

      // Position within past box - fixed, not moving
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

function FutureParticles({ count, t }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

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

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();

    const futureFraction = Math.max(1 - t, 0.01);
    const futureWidth = 8 * futureFraction;
    const futureStart = -4 + 8 * t;

    // Intensity increases as future shrinks
    const intensity = 1 / futureFraction;
    const chaos = 0.05 + 0.1 * Math.min(intensity - 1, 5);
    const speedMult = 1 + Math.min(intensity - 1, 8);

    particles.forEach((particle, i) => {
      // Base position - x is normalized 0-1 within future box, y/z centered
      const baseX = futureStart + ((particle.x + 1) / 2) * futureWidth;
      const baseY = particle.y * 0.8;
      const baseZ = particle.z * 0.8;

      // Add chaotic motion that increases with intensity
      dummy.position.set(
        baseX + Math.sin(time * particle.speed * speedMult + particle.offset) * chaos,
        baseY + Math.cos(time * particle.speed * speedMult * 0.8 + particle.offset * 1.3) * chaos,
        baseZ + Math.sin(time * particle.speed * speedMult * 0.6 + particle.offset * 0.7) * chaos
      );

      // Scale increases with excitation
      dummy.scale.setScalar(0.035 + Math.min(intensity * 0.005, 0.03));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#00aaff" />
    </instancedMesh>
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

function EntropyScene({ t }) {
  const presentRef = useRef();

  useFrame(({ clock }) => {
    const s = 1 + 0.05 * Math.sin(clock.getElapsedTime() * 3);
    if (presentRef.current) {
      presentRef.current.scale.set(1, s, s);
    }
  });

  const pastFraction = t;
  const futureFraction = 1 - t;
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

      {/* Past volume - semi-transparent box */}
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

      {/* Future volume */}
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

      {/* Present frontier */}
      <mesh ref={presentRef} position={[-4 + 8 * pastFraction, 0, 0]}>
        <boxGeometry args={[0.05, 2.2, 2.2]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Big Bang singularity */}
      <BigBangSingularity visible={t < 0.05} />

      {/* Past: frozen particles - collapsed states, count increases as entropy converts */}
      {pastFraction > 0.01 && (
        <PastParticles count={Math.floor(600 * pastFraction)} t={t} />
      )}

      {/* Future: particle count decreases as info entropy converts to thermo entropy */}
      {futureFraction > 0.01 && (
        <FutureParticles count={Math.floor(600 * futureFraction)} t={t} />
      )}

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
          PAST
        </Text>
      )}
      <Text
        position={[-4 + 8 * pastFraction, -1.8, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
      >
        NOW
      </Text>
      {futureFraction > 0.05 && (
        <Text
          position={[4 - 4 * futureFraction, -1.8, 0]}
          fontSize={0.25}
          color="#44aaff"
          anchorX="center"
        >
          FUTURE
        </Text>
      )}
    </>
  );
}

function StatsPanel({ t }) {
  const futureFraction = 1 - t;
  const infoEntropy = futureFraction > 0.01 ? futureFraction : 0;
  const infoEntropyDensity = futureFraction > 0.01 ? 1 / futureFraction : Infinity;
  const thermoEntropy = t;
  const totalEntropy = 1;

  return (
    <div className="stats-panel">
      <h3>Entropy Conversion</h3>

      <div className="stat-row">
        <span className="stat-label">S<sub>info</sub> <small>(future)</small></span>
        <span className="stat-value">{infoEntropy.toFixed(2)}</span>
        <div className="stat-bar">
          <div className="stat-fill info" style={{ width: `${infoEntropy * 100}%` }} />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">S<sub>therm</sub> <small>(past)</small></span>
        <span className="stat-value">{thermoEntropy.toFixed(2)}</span>
        <div className="stat-bar">
          <div className="stat-fill thermo" style={{ width: `${thermoEntropy * 100}%` }} />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">S<sub>total</sub></span>
        <span className="stat-value">{totalEntropy.toFixed(2)}</span>
        <div className="stat-bar">
          <div className="stat-fill total" style={{ width: '100%' }} />
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">Density <small>(pressure)</small></span>
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
        NOW converts S<sub>info</sub> → S<sub>therm</sub>
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
          <label>Time Progression</label>
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
        <h4>Particles</h4>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>Collapsed events (what has happened)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color future"></span>
          <span>Possible states (what could happen)</span>
        </div>
        <h4>Areas</h4>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>Past: thermodynamic entropy (fixed)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color future"></span>
          <span>Future: available entropy space (shrinking)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color present"></span>
          <span>NOW: collapse frontier</span>
        </div>
      </div>
    </div>
  );
}
