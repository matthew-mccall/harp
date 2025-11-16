'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';

function InterviewerModel() {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#e8b4b8" />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.8, 32]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.4, -0.1, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial color="#e8b4b8" />
      </mesh>
      <mesh position={[0.4, -0.1, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial color="#e8b4b8" />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.1, 0.55, 0.25]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.1, 0.55, 0.25]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} />
      <OrbitControls enableZoom={false} enablePan={false} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, 5]} intensity={0.5} />
      
      <Suspense fallback={null}>
        <InterviewerModel />
      </Suspense>
    </>
  );
}

export default function InterviewerVideo() {
  return (
    <div className="h-64 bg-gradient-to-br from-black via-gray-950 to-black border-l border-b border-white/10 overflow-hidden relative shadow-2xl shadow-white/5">
      <Canvas>
        <Scene />
      </Canvas>
      <div className="absolute top-4 left-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-lg text-xs shadow-lg">
        AI Interviewer
      </div>
    </div>
  );
}

