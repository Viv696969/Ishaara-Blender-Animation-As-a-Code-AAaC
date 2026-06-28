"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { useEditorStore } from "@/store/useEditorStore";
import { retargetClip } from "@/lib/utils";
import { useAnimationController } from "@/hooks/useAnimationController";

export function Model() {
  const { modelFile, animations, activeAnimationId } = useEditorStore();
  const [model, setModel] = useState<THREE.Group | null>(null);
  
  // Grab our new Animation Engine
  const controller = useAnimationController(model);

  // Load Model & Memory Management
  useEffect(() => {
    if (!modelFile) {
      setModel(null);
      return;
    }
    
    const url = URL.createObjectURL(modelFile);
    const loader = new FBXLoader();

    loader.load(url, (fbx) => {
      // Normalization and centering[cite: 3]
      const box = new THREE.Box3().setFromObject(fbx);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 10) fbx.scale.setScalar(1 / (maxDim / 2));

      box.setFromObject(fbx);
      const center = new THREE.Vector3();
      box.getCenter(center);
      fbx.position.sub(center);
      box.setFromObject(fbx);
      fbx.position.y -= box.min.y;

      // Enable shadows and proper materials[cite: 3]
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => { m.side = THREE.FrontSide; });
          }
        }
      });

      setModel(fbx);
      URL.revokeObjectURL(url);
    });

    return () => { 
      URL.revokeObjectURL(url); 
    };
  }, [modelFile]);

  // Handle Retargeting & Caching
  useEffect(() => {
    if (!controller || !model) return;

    animations.forEach((anim) => {
      // Retarget to correct bone structure[cite: 3]
      const retargeted = retargetClip(model, anim.clip);
      
      // Load into the controller (caching happens automatically internally)
      controller.loadClip(anim.id, retargeted);
    });
  }, [animations, model, controller]);

  // Handle Playback Triggers
  useEffect(() => {
    if (!controller) return;

    if (activeAnimationId) {
      // Triggers smooth crossfades automatically inside the controller
      controller.play(activeAnimationId, { 
        fadeDuration: 0.4, 
        loop: THREE.LoopRepeat 
      });
    } else {
      controller.fadeOut(0.3);
    }
  }, [activeAnimationId, controller]);

  return model ? <primitive object={model} /> : null;
}