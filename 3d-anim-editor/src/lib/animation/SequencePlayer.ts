import * as THREE from "three";
import { AnimationController } from "./AnimationController";

export class SequencePlayer {
  private controller: AnimationController;
  private sequence: string[] = []; 
  private currentIndex: number = -1;
  public isPlaying: boolean = false;
  
  public onSequenceComplete?: () => void;
  public onSequenceProgress?: (index: number) => void;

  constructor(controller: AnimationController) {
    this.controller = controller;
    this.handleFinished = this.handleFinished.bind(this);
    
    // Listen to the existing mixer for when animations naturally finish
    this.controller.mixer.addEventListener("finished", this.handleFinished);
  }

  public play(sequenceAnimIds: string[], blendDuration: number = 0.4) {
    if (sequenceAnimIds.length === 0) return;
    this.sequence = sequenceAnimIds;
    this.currentIndex = 0;
    this.isPlaying = true;
    this.playCurrent(blendDuration);
  }

  public stop() {
    this.isPlaying = false;
    this.currentIndex = -1;
    this.controller.stop();
    if (this.onSequenceComplete) this.onSequenceComplete();
  }

  private playCurrent(blendDuration: number) {
    if (!this.isPlaying || this.currentIndex >= this.sequence.length) {
      this.stop();
      return;
    }

    const animId = this.sequence[this.currentIndex];
    if (this.onSequenceProgress) this.onSequenceProgress(this.currentIndex);

    // Reuse existing play method. Use LoopOnce so the "finished" event fires.
    this.controller.play(animId, {
      loop: THREE.LoopOnce,
      repetitions: 1,
      fadeDuration: blendDuration
    });
  }

  private handleFinished(e: any) {
    if (!this.isPlaying) return;
    
    if (e.action === this.controller.currentAction) {
      this.currentIndex++;
      // Since LoopOnce clamps the animation at the end, 
      // immediately playing the next one triggers a smooth crossfade from that clamped pose.
      this.playCurrent(0.4); 
    }
  }

  public dispose() {
    this.stop();
    this.controller.mixer.removeEventListener("finished", this.handleFinished);
  }
}