import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function InstructionGrid({ t }) {
  const gridSize = 8; // 8x8 grid = 64 instructions
  const totalInstructions = gridSize * gridSize;
  const executedCount = Math.floor(t * totalInstructions);
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();

    for (let i = 0; i < totalInstructions; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      // Position in grid above CPU
      const x = (col - gridSize / 2 + 0.5) * 0.25;
      const z = (row - gridSize / 2 + 0.5) * 0.25;
      const y = 1.8;

      const isExecuted = i < executedCount;
      const isProcessing = i === executedCount;

      if (isExecuted) {
        // Move to executed area (below CPU)
        dummy.position.set(
          (col - gridSize / 2 + 0.5) * 0.2,
          -1.2 - (row * 0.15),
          (Math.random() - 0.5) * 0.1
        );
        dummy.scale.setScalar(0.08);
      } else if (isProcessing) {
        // Pulsing at the CPU core
        const pulse = 1 + 0.3 * Math.sin(time * 10);
        dummy.position.set(0, 0.5, 0);
        dummy.scale.setScalar(0.15 * pulse);
      } else {
        // Pending in grid
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(0.1);
      }

      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, totalInstructions]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00aaff" emissive="#0066ff" emissiveIntensity={0.5} />
    </instancedMesh>
  );
}

function ExecutedInstructions({ t }) {
  const gridSize = 8;
  const totalInstructions = gridSize * gridSize;
  const executedCount = Math.floor(t * totalInstructions);
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const temp = [];
    const seededRandom = (seed) => {
      return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let s = Math.imul(seed ^ seed >>> 15, 1 | seed);
        s = s + Math.imul(s ^ s >>> 7, 61 | s) ^ s;
        return ((s ^ s >>> 14) >>> 0) / 4294967296;
      };
    };
    const rand = seededRandom(98765);
    for (let i = 0; i < totalInstructions; i++) {
      temp.push({
        x: (rand() - 0.5) * 1.8,
        y: rand() * 0.3,
        z: (rand() - 0.5) * 1.8,
      });
    }
    return temp;
  }, []);

  useFrame(() => {
    if (!mesh.current) return;

    for (let i = 0; i < totalInstructions; i++) {
      if (i < executedCount) {
        const pos = positions[i];
        dummy.position.set(pos.x, -0.8 - pos.y, pos.z);
        dummy.scale.setScalar(0.05);
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
      }

      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, totalInstructions]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ff6600" />
    </instancedMesh>
  );
}

function CPUChip({ t }) {
  const coreRef = useRef();

  useFrame(({ clock }) => {
    if (coreRef.current) {
      const pulse = 1 + 0.02 * Math.sin(clock.getElapsedTime() * 6);
      coreRef.current.scale.set(pulse, 1, pulse);
    }
  });

  const heatIntensity = t;

  return (
    <group position={[0, 0, 0]} scale={0.6}>
      {/* CPU Package / IHS (Integrated Heat Spreader) */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[2, 0.15, 2]} />
        <meshStandardMaterial
          color="#a8a8a8"
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* CPU Die (the actual silicon) */}
      <mesh ref={coreRef} position={[0, 0.05, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial
          color="#333"
          emissive="#00ff44"
          emissiveIntensity={0.3 + t * 0.7}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Die markings / circuits */}
      {[...Array(4)].map((_, i) => (
        <mesh key={i} position={[(i % 2 - 0.5) * 0.5, 0.11, (Math.floor(i / 2) - 0.5) * 0.5]}>
          <boxGeometry args={[0.15, 0.02, 0.15]} />
          <meshStandardMaterial
            color="#444"
            emissive="#00ffaa"
            emissiveIntensity={0.2 + t * 0.5}
          />
        </mesh>
      ))}

      {/* NOW - Execution unit (glowing center) */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.25, 0.15, 0.25]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Pins on bottom */}
      <group position={[0, -0.25, 0]}>
        {[...Array(36)].map((_, i) => {
          const row = Math.floor(i / 6);
          const col = i % 6;
          return (
            <mesh key={i} position={[(col - 2.5) * 0.3, 0, (row - 2.5) * 0.3]}>
              <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
              <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.5} />
            </mesh>
          );
        })}
      </group>

      {/* Heat sink on top */}
      <group position={[0, 0.4, 0]}>
        {[...Array(12)].map((_, i) => (
          <mesh key={i} position={[(i - 5.5) * 0.15, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.4, 1.6]} />
            <meshStandardMaterial
              color="#e0e0e0"
              emissive="#ff4400"
              emissiveIntensity={heatIntensity * 0.3}
              metalness={0.3}
              roughness={0.5}
            />
          </mesh>
        ))}
        {/* Heat sink base */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[1.8, 0.1, 1.6]} />
          <meshStandardMaterial
            color="#e0e0e0"
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}

function HeatParticles({ t }) {
  const count = 80;
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    const seededRandom = (seed) => {
      return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let s = Math.imul(seed ^ seed >>> 15, 1 | seed);
        s = s + Math.imul(s ^ s >>> 7, 61 | s) ^ s;
        return ((s ^ s >>> 14) >>> 0) / 4294967296;
      };
    };
    const rand = seededRandom(54321);
    for (let i = 0; i < count; i++) {
      temp.push({
        x: (rand() - 0.5) * 1.2,
        z: (rand() - 0.5) * 1.0,
        speed: 0.5 + rand() * 1.5,
        phase: rand() * Math.PI * 2,
      });
    }
    return temp;
  }, []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();
    const visibleCount = Math.floor(count * t);

    particles.forEach((particle, i) => {
      if (i < visibleCount) {
        // Rise up from heat sink
        const yOffset = (time * particle.speed * 0.5 + particle.phase) % 1.5;
        dummy.position.set(
          particle.x + Math.sin(time * particle.speed + particle.phase) * 0.05,
          0.5 + yOffset,
          particle.z + Math.cos(time * particle.speed + particle.phase) * 0.05
        );
        dummy.scale.setScalar(0.025 + (1 - yOffset / 1.5) * 0.015);
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
      <meshBasicMaterial color="#ff4400" transparent opacity={0.6} />
    </instancedMesh>
  );
}

function PendingInstructionGrid({ t }) {
  const gridSize = 8;
  const totalInstructions = gridSize * gridSize;
  const executedCount = Math.floor(t * totalInstructions);
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();

    for (let i = 0; i < totalInstructions; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      const isExecuted = i < executedCount;
      const isProcessing = i === executedCount;

      if (isExecuted) {
        // Hide - shown by ExecutedInstructions
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
      } else if (isProcessing) {
        // At the NOW point
        const pulse = 1 + 0.3 * Math.sin(time * 10);
        dummy.position.set(0, 0.15, 0);
        dummy.scale.setScalar(0.08 * pulse);
      } else {
        // In pending grid above CPU
        const x = (col - gridSize / 2 + 0.5) * 0.15;
        const z = (row - gridSize / 2 + 0.5) * 0.15;
        dummy.position.set(x, 1.2, z);
        dummy.scale.setScalar(0.06);
      }

      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, totalInstructions]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00aaff" emissive="#0066ff" emissiveIntensity={0.5} />
    </instancedMesh>
  );
}

function CPUScene({ t }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, 3, -5]} intensity={0.6} color="#aabbff" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffffff" />

      <CPUChip t={t} />
      <PendingInstructionGrid t={t} />
      <ExecutedInstructions t={t} />
      <HeatParticles t={t} />

      {/* Labels */}
      <Text position={[0, 1.55, 0]} fontSize={0.12} color="#00aaff">
        PENDING INSTRUCTIONS
      </Text>
      <Text position={[0, 1.4, 0]} fontSize={0.06} color="#666">
        Informational Entropy (Future)
      </Text>

      <Text position={[0.9, 0.1, 0]} fontSize={0.08} color="#ffffff">
        NOW
      </Text>

      <Text position={[0, -0.65, 0]} fontSize={0.1} color="#ff8844">
        EXECUTED
      </Text>
      <Text position={[0, -0.78, 0]} fontSize={0.06} color="#666">
        Thermodynamic Entropy (Past)
      </Text>
    </>
  );
}

export default function CPUVisualization({ t }) {
  return (
    <div className="cpu-visualization">
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={10}
        />
        <CPUScene t={t} />
      </Canvas>
    </div>
  );
}
