"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import { Suspense } from "react";
import { Model } from "./Model";
import { useEditorStore } from "@/store/useEditorStore";
import { Box } from "lucide-react";

export function Scene() {
  const modelFile = useEditorStore((state) => state.modelFile);

  return (
    <div className="relative w-full h-full bg-[var(--bg-base)]">
      {!modelFile && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <Box
            className="w-12 h-12 text-[var(--text-secondary)]/20 mb-6"
            strokeWidth={1}
          />

          <h2 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]/70">
            Workspace Empty
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]/40">
            Drop a character model into the sidebar to begin.
          </p>
        </div>
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [0, 1.5, 4],
          fov: 40,
        }}
      >
        {/* Background */}
        <color attach="background" args={["#0B1020"]} />
        <fog attach="fog" args={["#0B1020", 7, 22]} />

        {/* Ambient */}
        <ambientLight intensity={0.45} />

        {/* Main Key Light */}
        <directionalLight
          position={[6, 10, 6]}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
          color="#F8FAFC"
        />

        {/* Soft Fill */}
        <directionalLight
          position={[-6, 5, -6]}
          intensity={0.55}
          color="#A5B4FC"
        />

        {/* Rim Light */}
        <directionalLight
          position={[0, 4, -8]}
          intensity={0.35}
          color="#7C3AED"
        />

        <Suspense fallback={null}>
          <Environment preset="studio" />

          <Model />

          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.45}
            blur={2.5}
            far={4}
            scale={12}
            color="#000000"
          />

          <Grid
            args={[24, 24]}
            cellSize={0.5}
            sectionSize={2}
            fadeDistance={18}
            fadeStrength={1}
            cellThickness={0.45}
            sectionThickness={1.1}
            cellColor="#273449"
            sectionColor="#394B68"
            infiniteGrid
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2 + 0.1}
        />
      </Canvas>
    </div>
  );
}