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
    <div className="h-64 bg-black overflow-hidden relative border-l-2 border-b-2 border-cyan-400/30 crt-screen" style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)' }}>
      {/* Retro corner brackets */}
      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-400/50" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-400/50" />

      <Canvas>
        <Scene />
      </Canvas>

      {/* Retro label */}
      <div className="absolute top-3 left-3 text-xs font-mono tracking-widest uppercase text-cyan-400 flex items-center gap-2 border-2 border-cyan-400/50 bg-black px-2 py-1" style={{ boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)' }}>
        <span className="w-2 h-2 bg-cyan-400 animate-pulse" />
        [AI.INTERVIEWER]
      </div>
    </div>
  );
}

