import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AnimationController } from "@/lib/animation/AnimationController";
import { useEditorStore } from "@/store/useEditorStore";

export function useAnimationController(model: THREE.Object3D | null) {
  const controllerRef = useRef<AnimationController | null>(null);
  const setController = useEditorStore((state) => state.setController);
  const setPlaybackState = useEditorStore((state) => state.setPlaybackState);

  useEffect(() => {
    if (!model) return;

    controllerRef.current = new AnimationController(model);
    setController(controllerRef.current);

    // Sync state to UI periodically or on events
    const interval = setInterval(() => {
      if (controllerRef.current) {
        setPlaybackState(controllerRef.current.state);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
        setController(null);
      }
    };
  }, [model, setController, setPlaybackState]);

  useFrame((_, delta) => {
    if (controllerRef.current) {
      controllerRef.current.update(delta);
    }
  });

  return controllerRef.current;
}