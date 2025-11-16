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
    <div className="h-64 bg-gradient-to-br from-black via-gray-950 to-black overflow-hidden relative group">
      {/* Animated corner accents */}
      <div className="absolute top-0 left-0 w-16 h-16 border-l border-t border-white/20 transition-all group-hover:w-20 group-hover:h-20 group-hover:border-white/40" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r border-b border-white/20 transition-all group-hover:w-20 group-hover:h-20 group-hover:border-white/40" />
      
      <Canvas>
        <Scene />
      </Canvas>
      
      {/* Floating label without box */}
      <div className="absolute top-4 left-4 text-xs font-medium tracking-widest uppercase text-white/60 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-white/50 to-transparent" />
        AI Interviewer
      </div>
    </div>
  );
}

