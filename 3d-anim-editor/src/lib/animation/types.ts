import * as THREE from "three";

export enum PlaybackState {
  IDLE = "IDLE",
  PLAYING = "PLAYING",
  TRANSITIONING = "TRANSITIONING",
  PAUSED = "PAUSED",
  FINISHED = "FINISHED"
}

export enum QueueMode {
  MANUAL = "MANUAL",
  SEQUENTIAL = "SEQUENTIAL",
  LOOP_ALL = "LOOP_ALL",
  SHUFFLE = "SHUFFLE"
}

export interface AnimationOptions {
  timeScale?: number;
  weight?: number;
  loop?: THREE.AnimationActionLoopStyles;
  repetitions?: number;
  fadeDuration?: number;
  layer?: number; // Prepared for future masked/layered blending (e.g., Upper Body vs Lower Body)
}