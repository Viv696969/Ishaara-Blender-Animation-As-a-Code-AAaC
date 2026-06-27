/**
 * FBXAnimationViewer.jsx
 *
 * Drop-in React component for loading a Mixamo FBX model
 * and transferring animations from other Mixamo FBX files onto it.
 *
 * SETUP (in your React project):
 *   npm install three @react-three/fiber @react-three/drei
 *
 * USAGE:
 *   import FBXAnimationViewer from './FBXAnimationViewer';
 *   <FBXAnimationViewer />
 *
 * HOW IT WORKS:
 *   1. Drop your main model FBX  → it loads and appears in the scene
 *   2. Drop animation FBX files  → clips are extracted and listed
 *   3. Click an animation name   → it crossfades onto the model
 */

import React, { useRef, useState, useEffect, useCallback, Suspense } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";

// ─── Retargeting helper ────────────────────────────────────────────────────────
// Filters an AnimationClip's tracks to only those whose bone exists in target.
// Works automatically for Mixamo → Mixamo because bone names are identical.
// function retargetClip(targetModel, sourceClip) {
//   const boneNames = new Set();
//   targetModel.traverse((node) => {
//     if (node.isBone || node.type === "Bone") boneNames.add(node.name);
//   });

//   const validTracks = sourceClip.tracks.filter((track) => {
//     // track.name format: "mixamorigHips.position" or "mixamorigHips.quaternion"
//     const boneName = track.name.split(".")[0];
//     return boneNames.has(boneName);
//   });

//   return new THREE.AnimationClip(
//     sourceClip.name || "clip",
//     sourceClip.duration,
//     validTracks
//   );
// }

function exportClipToJSON(clip) {
  const data = {
    name: clip.name,
    duration: clip.duration,
    tracks: clip.tracks.map(track => ({
      name: track.name,
      type: track.constructor.name, // e.g. "QuaternionKeyframeTrack"
      times: Array.from(track.times),
      values: Array.from(track.values),
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clip.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function retargetClip(targetModel, sourceClip) {
  const boneNames = new Set();
  targetModel.traverse((node) => {
    if (node.isBone || node.type === "Bone") boneNames.add(node.name);
  });

  const validTracks = sourceClip.tracks
    .filter((track) => {
      const [boneName, property] = track.name.split(".");

      // Skip the Armature object track — it moves/rotates the whole rig
      if (boneName.startsWith("Armature")) return false;

      // Only keep quaternion (rotation) tracks
      // Position tracks cause coordinate space mismatches
      // Scale tracks are usually not needed
      if (property !== "quaternion") return false;

      // Check bone exists in target (with mixamorig → mixamorig2 remap)
      const remapped = boneName.replace("mixamorig2", "mixamorig2");
      return boneNames.has(remapped);
    })
    .map((track) => {
      const [boneName, property] = track.name.split(".");
      const remappedBone = boneName.replace("mixamorig2", "mixamorig2");

      const ClipClass = track.constructor;
      return new ClipClass(
        `${remappedBone}.${property}`,
        track.times,
        track.values,
        track.interpolation
      );
    });

  return new THREE.AnimationClip(
    sourceClip.name || "clip",
    sourceClip.duration,
    validTracks
  );
}

// ─── Scene content ─────────────────────────────────────────────────────────────
function ModelScene({ modelFile, animationClips, activeClipName, onMixerReady }) {
  const groupRef = useRef();
  const mixerRef = useRef(null);
  const currentActionRef = useRef(null);
  const actionsMapRef = useRef({});
  const { scene } = useThree();
  const [modelLoaded, setModelLoaded] = useState(false);
  const modelRef = useRef(null);

  // Load model when file changes
  useEffect(() => {
    if (!modelFile) return;

    const loader = new FBXLoader();
    const url = URL.createObjectURL(modelFile);

    loader.load(
      url,
      (fbx) => {
        URL.revokeObjectURL(url);

        // Normalize scale — Mixamo exports at 100x
        const box = new THREE.Box3().setFromObject(fbx);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 10) fbx.scale.setScalar(1 / (maxDim / 2));

        // Center at origin on Y=0
        box.setFromObject(fbx);
        const center = new THREE.Vector3();
        box.getCenter(center);
        fbx.position.sub(center);
        box.setFromObject(fbx);
        const minY = box.min.y;
        fbx.position.y -= minY;

        // Nice materials
        fbx.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const mats = Array.isArray(child.material)
                ? child.material
                : [child.material];
              mats.forEach((m) => {
                m.side = THREE.FrontSide;
              });
            }
          }
        });

        // Replace previous model
        if (groupRef.current) {
          while (groupRef.current.children.length)
            groupRef.current.remove(groupRef.current.children[0]);
        }

        if (mixerRef.current) mixerRef.current.stopAllAction();
        mixerRef.current = new THREE.AnimationMixer(fbx);
        currentActionRef.current = null;
        actionsMapRef.current = {};

        groupRef.current.add(fbx);
        modelRef.current = fbx;
        setModelLoaded(true);
        onMixerReady(mixerRef.current);
        // ── Debug: log bone names from your model ──
console.group(`🧍 Bones in model`);
fbx.traverse((node) => {
  if (node.isBone || node.type === "Bone") {
    console.log(node.name);
  }
});
console.groupEnd();
      },
      undefined,
      (err) => {
        URL.revokeObjectURL(url);
        console.error("Model load error:", err);
      }
    );
  }, [modelFile]);

  // Build / update actions when clips change
  useEffect(() => {
    if (!mixerRef.current || !modelRef.current || !modelLoaded) return;

    animationClips.forEach((clip) => {
      if (!actionsMapRef.current[clip.name]) {
        const retargeted = retargetClip(modelRef.current, clip);
        actionsMapRef.current[clip.name] = mixerRef.current.clipAction(retargeted);
      }
    });
  }, [animationClips, modelLoaded]);

  // Play active clip with crossfade
  useEffect(() => {
    if (!mixerRef.current || !activeClipName) return;
    const nextAction = actionsMapRef.current[activeClipName];
    if (!nextAction) return;

    if (currentActionRef.current && currentActionRef.current !== nextAction) {
      nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
      currentActionRef.current.crossFadeTo(nextAction, 0.3, true);
    } else {
      nextAction.reset().play();
    }

    nextAction.play();
    currentActionRef.current = nextAction;
  }, [activeClipName]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return <group ref={groupRef} />;
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function FBXAnimationViewer() {
  const [modelFile, setModelFile] = useState(null);
  const [animationClips, setAnimationClips] = useState([]);
  const [activeClipName, setActiveClipName] = useState(null);
  const [loadingAnim, setLoadingAnim] = useState(false);
  const [mixer, setMixer] = useState(null);
  const [isDraggingModel, setIsDraggingModel] = useState(false);
  const [isDraggingAnim, setIsDraggingAnim] = useState(false);

  const loadAnimationFBX = useCallback((file) => {
    setLoadingAnim(true);
    const loader = new FBXLoader();
    const url = URL.createObjectURL(file);

    loader.load(
      url,
      (fbx) => {
        URL.revokeObjectURL(url);
        setLoadingAnim(false);

        // ── Debug: log bone names from animation FBX ──
console.group(`🦴 Bones in "${file.name}"`);
fbx.traverse((node) => {
  if (node.isBone || node.type === "Bone") {
    console.log(node.name);
  }
});
console.groupEnd();

// ── Debug: log track names from each clip ──
fbx.animations.forEach((clip, i) => {
  console.group(`🎬 Clip ${i}: "${clip.name}" — ${clip.tracks.length} tracks`);
  clip.tracks.forEach((track) => console.log(track.name));
  console.groupEnd();
});

        if (!fbx.animations?.length) {
          alert(`No animations found in "${file.name}"`);
          return;
        }

        // Name clips after the file if unnamed
        fbx.animations.forEach((clip, i) => {
          if (!clip.name || clip.name === "mixamo.com") {
            clip.name = file.name.replace(".fbx", "") + (fbx.animations.length > 1 ? `_${i}` : "");
          }
        });

        setAnimationClips((prev) => {
          const existing = new Set(prev.map((c) => c.name));
          const newClips = fbx.animations.filter((c) => !existing.has(c.name));
          return [...prev, ...newClips];
        });
      },
      undefined,
      (err) => {
        URL.revokeObjectURL(url);
        setLoadingAnim(false);
        console.error("Animation load error:", err);
      }
    );
  }, []);

  const handleModelDrop = (e) => {
    e.preventDefault();
    setIsDraggingModel(false);
    const file = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (file?.name.endsWith(".fbx")) {
      setModelFile(file);
      setAnimationClips([]);
      setActiveClipName(null);
    }
  };

  const handleAnimDrop = (e) => {
    e.preventDefault();
    setIsDraggingAnim(false);
    const files = Array.from(e.dataTransfer?.files || e.target.files || []);
    files.filter((f) => f.name.endsWith(".fbx")).forEach(loadAnimationFBX);
  };

  const removeClip = (clipName) => {
    setAnimationClips((prev) => prev.filter((c) => c.name !== clipName));
    if (activeClipName === clipName) setActiveClipName(null);
  };

  return (
    <div style={styles.root}>
      {/* ── Sidebar ── */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.logo}>⬡</span>
          <span style={styles.logoText}>FBX Retargeter</span>
        </div>

        {/* Model drop zone */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>MODEL</p>
          <div
            style={{
              ...styles.dropZone,
              ...(isDraggingModel ? styles.dropZoneActive : {}),
              ...(modelFile ? styles.dropZoneLoaded : {}),
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingModel(true); }}
            onDragLeave={() => setIsDraggingModel(false)}
            onDrop={handleModelDrop}
            onClick={() => document.getElementById("model-input").click()}
          >
            <input
              id="model-input"
              type="file"
              accept=".fbx"
              style={{ display: "none" }}
              onChange={handleModelDrop}
            />
            {modelFile ? (
              <>
                <span style={styles.dropIcon}>✓</span>
                <span style={styles.dropText}>{modelFile.name}</span>
              </>
            ) : (
              <>
                <span style={styles.dropIcon}>↑</span>
                <span style={styles.dropText}>Drop your model .fbx</span>
                <span style={styles.dropHint}>or click to browse</span>
              </>
            )}
          </div>
        </div>

        {/* Animation drop zone */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>ANIMATIONS</p>
          <div
            style={{
              ...styles.dropZone,
              ...(isDraggingAnim ? styles.dropZoneActive : {}),
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingAnim(true); }}
            onDragLeave={() => setIsDraggingAnim(false)}
            onDrop={handleAnimDrop}
            onClick={() => document.getElementById("anim-input").click()}
          >
            <input
              id="anim-input"
              type="file"
              accept=".fbx"
              multiple
              style={{ display: "none" }}
              onChange={handleAnimDrop}
            />
            <span style={styles.dropIcon}>{loadingAnim ? "⟳" : "↑"}</span>
            <span style={styles.dropText}>
              {loadingAnim ? "Loading…" : "Drop animation .fbx files"}
            </span>
            <span style={styles.dropHint}>multiple files supported</span>
          </div>

          {/* Clip list */}
          {animationClips.length > 0 && (
            <div style={styles.clipList}>
              {animationClips.map((clip) => (
                <div
                  key={clip.name}
                  style={{
                    ...styles.clipItem,
                    ...(activeClipName === clip.name ? styles.clipItemActive : {}),
                  }}
                >
                  <button
                    style={styles.clipButton}
                    onClick={() => setActiveClipName(clip.name)}
                  >
                    <span style={styles.clipPlay}>
                      {activeClipName === clip.name ? "▶" : "›"}
                    </span>
                    <span style={styles.clipName}>{clip.name}</span>
                    <span style={styles.clipDuration}>
                      {clip.duration.toFixed(1)}s
                    </span>
                  </button>
                  <button
  style={styles.clipExport}
  onClick={() => exportClipToJSON(clip)}
  title="Export JSON"
>
  ↓
</button>
<button
  style={styles.clipRemove}
  onClick={() => removeClip(clip.name)}
  title="Remove"
>
  ×
</button>
                </div>
              ))}
            </div>
          )}

          {!modelFile && animationClips.length > 0 && (
            <p style={styles.warn}>⚠ Load a model first</p>
          )}
        </div>

        {/* Help */}
        <div style={styles.helpBlock}>
          <p style={styles.helpTitle}>How to use</p>
          <ol style={styles.helpList}>
            <li>Drop your <strong>main model</strong> FBX (Mixamo-rigged)</li>
            <li>Drop one or more <strong>animation</strong> FBX files</li>
            <li><strong>Click</strong> an animation to play it</li>
          </ol>
          <p style={styles.helpHint}>Orbit: drag · Zoom: scroll · Pan: right-drag</p>
        </div>
      </div>

      {/* ── Viewport ── */}
      <div style={styles.viewport}>
        {!modelFile && (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>⬡</p>
            <p style={styles.emptyTitle}>No model loaded</p>
            <p style={styles.emptyDesc}>Drop a Mixamo FBX in the sidebar to get started</p>
          </div>
        )}

        <Canvas
          shadows
          camera={{ position: [0, 1.6, 3.5], fov: 50, near: 0.01, far: 1000 }}
          style={{ background: "#0e0e12" }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-4, 3, -3]} intensity={0.3} color="#8ab4f8" />

          <Suspense fallback={null}>
            <Environment preset="city" />
            {modelFile && (
              <ModelScene
                modelFile={modelFile}
                animationClips={animationClips}
                activeClipName={activeClipName}
                onMixerReady={setMixer}
              />
            )}
            <Grid
              args={[20, 20]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#2a2a35"
              sectionSize={2}
              sectionThickness={1}
              sectionColor="#3a3a4a"
              fadeDistance={15}
              receiveShadow
            />
          </Suspense>

          <OrbitControls
            makeDefault
            minDistance={0.5}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2 + 0.1}
          />
        </Canvas>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    background: "#0e0e12",
    color: "#e0e0e8",
    overflow: "hidden",
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    background: "#13131a",
    borderRight: "1px solid #222230",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    overflowY: "auto",
    padding: "0 0 24px 0",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "20px 20px 16px",
    borderBottom: "1px solid #1e1e2a",
  },
  logo: { fontSize: 22, color: "#7c6af7" },
  logoText: { fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", color: "#e0e0ef" },
  section: { padding: "18px 16px 0" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#5a5a7a",
    margin: "0 0 8px",
  },
  dropZone: {
    border: "1.5px dashed #2e2e42",
    borderRadius: 8,
    padding: "14px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    transition: "all 0.15s",
    background: "#0e0e14",
  },
  dropZoneActive: {
    border: "1.5px dashed #7c6af7",
    background: "#18163a",
  },
  dropZoneLoaded: {
    border: "1.5px dashed #3ecf8e",
    background: "#0e1a15",
  },
  dropIcon: { fontSize: 20, color: "#5a5a7a" },
  dropText: { fontSize: 12, color: "#a0a0b8", textAlign: "center" },
  dropHint: { fontSize: 10, color: "#4a4a60", textAlign: "center" },
  clipList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 10,
  },
  clipItem: {
    display: "flex",
    alignItems: "center",
    borderRadius: 6,
    background: "#18181f",
    border: "1px solid #222230",
    overflow: "hidden",
  },
  clipItemActive: {
    background: "#1e1a3a",
    border: "1px solid #7c6af7",
  },
  clipButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#c0c0d8",
    fontSize: 12,
    textAlign: "left",
    minWidth: 0,
  },
  clipPlay: { color: "#7c6af7", fontSize: 10, flexShrink: 0 },
  clipName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 11,
  },
  clipDuration: { fontSize: 10, color: "#5a5a7a", flexShrink: 0 },
  clipRemove: {
    padding: "4px 8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#444455",
    fontSize: 16,
    lineHeight: 1,
    flexShrink: 0,
  },
  warn: { fontSize: 11, color: "#f0a030", marginTop: 8 },
  helpBlock: {
    margin: "20px 16px 0",
    background: "#18181f",
    border: "1px solid #222230",
    borderRadius: 8,
    padding: "12px 14px",
  },
  helpTitle: { fontSize: 11, fontWeight: 700, color: "#7c6af7", margin: "0 0 8px" },
  helpList: { paddingLeft: 16, margin: "0 0 8px", color: "#8888a8", fontSize: 11, lineHeight: 1.7 },
  helpHint: { fontSize: 10, color: "#4a4a60", margin: 0 },
  viewport: {
    flex: 1,
    position: "relative",
  },
  emptyState: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    pointerEvents: "none",
  },
  clipExport: {
  padding: "4px 8px",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#7c6af7",
  fontSize: 14,
  lineHeight: 1,
  flexShrink: 0,
},
  emptyIcon: { fontSize: 48, color: "#2a2a3a", margin: "0 0 12px" },
  emptyTitle: { fontSize: 18, color: "#3a3a50", margin: "0 0 6px", fontWeight: 600 },
  emptyDesc: { fontSize: 13, color: "#2a2a40" },
};