"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, ContactShadows } from "@react-three/drei";
import { Suspense } from "react";
import { Model } from "./Model";
import { useEditorStore } from "@/store/useEditorStore";
import { Box } from "lucide-react";

export function Scene() {
  const modelFile = useEditorStore((state) => state.modelFile);

  return (
    <div className="relative w-full h-full bg-[#0B0F14]">
      {!modelFile && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <Box className="w-16 h-16 text-white/5 mb-4" strokeWidth={1} />
          <h2 className="text-xl font-medium text-white/40 mb-2">Workspace Empty</h2>
          <p className="text-sm text-white/20">Drop a character model in the sidebar to begin</p>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 45 }}>
        <color attach="background" args={["#0B0F14"]} />
        <fog attach="fog" args={["#0B0F14", 5, 20]} />
        
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#7C3AED" />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <Model />
          
          {/* Premium Grid & Shadows */}
          <ContactShadows opacity={0.4} scale={10} blur={2} far={4} color="#000000" />
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1f2937"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#374151"
            fadeDistance={15}
            fadeStrength={1}
          />
        </Suspense>

        <OrbitControls 
          makeDefault 
          minDistance={1} 
          maxDistance={15} 
          maxPolarAngle={Math.PI / 2 + 0.1}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}