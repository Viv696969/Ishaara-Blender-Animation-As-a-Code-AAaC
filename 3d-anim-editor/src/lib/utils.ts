import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as THREE from "three";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Retargets an AnimationClip to a target model
export function retargetClip(targetModel: THREE.Object3D, sourceClip: THREE.AnimationClip) {
  const boneNames = new Set<string>();
  targetModel.traverse((node) => {
    if ((node as THREE.Bone).isBone || node.type === "Bone") {
      boneNames.add(node.name);
    }
  });

  const validTracks = sourceClip.tracks
    .filter((track) => {
      const [boneName, property] = track.name.split(".");
      if (boneName.startsWith("Armature")) return false; // Skip root armature
      if (property !== "quaternion") return false; // Keep only rotations

      const remapped = boneName.replace("mixamorig2", "mixamorig2");
      return boneNames.has(remapped);
    })
    .map((track) => {
      const [boneName, property] = track.name.split(".");
      const remappedBone = boneName.replace("mixamorig2", "mixamorig2");
      const ClipClass = (track as any).constructor;
      
      return new ClipClass(
        `${remappedBone}.${property}`,
        track.times,
        track.values,
        (track as any).interpolation
      );
    });

  return new THREE.AnimationClip(
    sourceClip.name || "clip",
    sourceClip.duration,
    validTracks
  );
}

// Exports a clip to a JSON file[cite: 3]
export function exportClipToJSON(clip: THREE.AnimationClip) {
  const data = {
    name: clip.name,
    duration: clip.duration,
    tracks: clip.tracks.map(track => ({
      name: track.name,
      type: track.constructor.name,
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