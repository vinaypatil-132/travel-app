'use client';

import { useRef, useState } from 'react';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Scene() {
  const { viewport } = useThree();
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Generate points once via state to avoid useMemo purity lint errors
  const [geometryData] = useState(() => {
    const numPoints = 2000;
    const pos = new Float32Array(numPoints * 3);
    const size = new Float32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      const r = 2 + Math.random() * 0.5;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      size[i] = Math.random() * 0.05 + 0.01;
    }
    return { positions: pos, sizes: size };
  });

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (!pointsRef.current || prefersReducedMotion) return;
    // Slow rotation
    pointsRef.current.rotation.y += delta * 0.05;
    pointsRef.current.rotation.x += delta * 0.02;

    // Interactive mouse tracking
    const { pointer } = state;
    pointsRef.current.rotation.y += (pointer.x * 0.2 - pointsRef.current.rotation.y) * 0.05;
    pointsRef.current.rotation.x += (-pointer.y * 0.2 - pointsRef.current.rotation.x) * 0.05;
  });

  // Calculate scale based on viewport width for responsiveness
  const scale = Math.min(viewport.width / 8, 1) * 1.5;

  return (
    <Float
      speed={prefersReducedMotion ? 0 : 1.5} 
      rotationIntensity={prefersReducedMotion ? 0 : 0.5} 
      floatIntensity={prefersReducedMotion ? 0 : 1}
    >
      <group scale={scale}>
        <Points ref={pointsRef} positions={geometryData.positions}>
          <PointMaterial
            transparent
            color="#f59e0b" // amber-500
            size={0.03}
            sizeAttenuation={true}
            depthWrite={false}
          />
        </Points>
        
        {/* Abstract orbits */}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[2.8, 0.005, 16, 100]} />
          <meshBasicMaterial color="#fcd34d" opacity={0.15} transparent />
        </mesh>
        <mesh rotation-y={Math.PI / 3} rotation-x={Math.PI / 4}>
          <torusGeometry args={[3.2, 0.005, 16, 100]} />
          <meshBasicMaterial color="#fbbf24" opacity={0.1} transparent />
        </mesh>
      </group>
    </Float>
  );
}

export default function HeroScene() {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <Scene />
      </Canvas>
    </div>
  );
}
