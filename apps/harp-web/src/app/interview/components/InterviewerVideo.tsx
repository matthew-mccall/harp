'use client';

import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, useFBX } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';

function InterviewerModel() {
  const interviewerModel = useFBX('/interviewer.fbx');

  // Fix common FBX transparency/material issues
  useEffect(() => {
    if (!interviewerModel) return;

    interviewerModel.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((mat: THREE.Material & any) => {
          if (!mat) return;
          // Ensure opaque rendering unless true transparency is required
          if ('transparent' in mat) mat.transparent = false;
          if ('opacity' in mat) mat.opacity = 1;
          if ('alphaTest' in mat) mat.alphaTest = 0;
          if ('depthWrite' in mat) mat.depthWrite = true;
          if ('depthTest' in mat) mat.depthTest = true;
          if ('side' in mat) mat.side = THREE.FrontSide;

          // Fix washed-out textures and ensure proper color space
          if ('map' in mat && mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace ?? (THREE as any).sRGBEncoding;
            mat.map.needsUpdate = true;
          }

          mat.needsUpdate = true;
        });
      }
    });

    // Reasonable default scaling/rotation for many FBX models
    interviewerModel.scale.setScalar(0.01);
    // interviewerModel.rotation.y = Math.PI; // face camera
  }, [interviewerModel]);

  return <primitive object={interviewerModel} />;
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0.05, 1.3, 1]} />
      {/*<OrbitControls enableZoom={false} enablePan={false} />*/}

      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={0.1} />
      {/*<pointLight position={[-5, 5, 5]} intensity={0.5} />*/}

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

      <Canvas
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          // Keep the gradient background visible behind the WebGL canvas
          gl.setClearAlpha(0);
        }}
        shadows
      >
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

