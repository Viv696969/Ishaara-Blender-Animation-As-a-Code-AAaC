import * as THREE from "three";
import { PlaybackState, QueueMode, AnimationOptions } from "./types";

export class AnimationController {
  public mixer: THREE.AnimationMixer;
  public root: THREE.Object3D;
  
  // Caches
  private clips: Map<string, THREE.AnimationClip> = new Map();
  private actions: Map<string, THREE.AnimationAction> = new Map();
  
  // State
  public state: PlaybackState = PlaybackState.IDLE;
  public currentAction: THREE.AnimationAction | null = null;
  public previousAction: THREE.AnimationAction | null = null;
  
  // Queue Management
  private animationQueue: string[] = [];
  private currentQueueIndex: number = -1;
  public queueMode: QueueMode = QueueMode.MANUAL;

  constructor(root: THREE.Object3D) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    
    // Bind events
    this.onFinished = this.onFinished.bind(this);
    this.onLoop = this.onLoop.bind(this);
    
    this.mixer.addEventListener("finished", this.onFinished);
    this.mixer.addEventListener("loop", this.onLoop);
  }

  /**
   * Caches a clip and creates its action once.
   */
  public loadClip(id: string, clip: THREE.AnimationClip): void {
    if (this.clips.has(id)) return;
    
    this.clips.set(id, clip);
    const action = this.mixer.clipAction(clip);
    
    // Future-proofing: If we want additive blending later, we set it here.
    // action.blendMode = THREE.NormalAnimationBlendMode;
    
    this.actions.set(id, action);
  }

  /**
   * Plays a specific animation by ID, utilizing advanced crossfading if another action is playing.
   */
  public play(id: string, options: AnimationOptions = {}): void {
    const action = this.actions.get(id);
    if (!action) {
      console.warn(`AnimationController: Action ${id} not found.`);
      return;
    }

    const { 
      fadeDuration = 0.4, 
      timeScale = 1, 
      weight = 1, 
      loop = THREE.LoopRepeat,
      repetitions = Infinity 
    } = options;

    this.previousAction = this.currentAction;
    this.currentAction = action;

    // Configure the new action
    this.currentAction.enabled = true;
    this.currentAction.setEffectiveTimeScale(timeScale);
    this.currentAction.setEffectiveWeight(weight);
    this.currentAction.setLoop(loop, repetitions);
    this.currentAction.clampWhenFinished = (loop === THREE.LoopOnce);

    if (this.previousAction && this.previousAction !== this.currentAction) {
      this.crossFade(this.previousAction, this.currentAction, fadeDuration);
    } else {
      this.currentAction.reset().play();
      this.state = PlaybackState.PLAYING;
    }
  }

  public crossFade(from: THREE.AnimationAction, to: THREE.AnimationAction, duration: number): void {
    this.state = PlaybackState.TRANSITIONING;
    
    // Synchronize actions to prevent foot-sliding/popping if they share similar cycles
    to.reset();
    if (from.getClip().duration === to.getClip().duration) {
      to.syncWith(from);
    }

    // Warp helps smoothly transition time scales
    to.play();
    from.crossFadeTo(to, duration, true);

    // Reset state after transition completes
    setTimeout(() => {
      if (this.state === PlaybackState.TRANSITIONING) {
        this.state = PlaybackState.PLAYING;
      }
    }, duration * 1000);
  }

  public fadeIn(id: string, duration: number = 0.4): void {
    const action = this.actions.get(id);
    if (!action) return;
    action.reset().fadeIn(duration).play();
    this.currentAction = action;
    this.state = PlaybackState.PLAYING;
  }

  public fadeOut(duration: number = 0.4): void {
    if (this.currentAction) {
      this.currentAction.fadeOut(duration);
      setTimeout(() => { this.stop(); }, duration * 1000);
    }
  }

  public stop(): void {
    this.mixer.stopAllAction();
    this.currentAction = null;
    this.previousAction = null;
    this.state = PlaybackState.IDLE;
  }

  public pause(): void {
    this.mixer.timeScale = 0;
    this.state = PlaybackState.PAUSED;
  }

  public resume(): void {
    this.mixer.timeScale = 1;
    this.state = PlaybackState.PLAYING;
  }

  // --- Queue System ---

  public queue(ids: string[], mode: QueueMode = QueueMode.SEQUENTIAL): void {
    this.animationQueue = ids;
    this.queueMode = mode;
    this.currentQueueIndex = 0;
  }

  public playSequence(): void {
    if (this.animationQueue.length === 0) return;
    this.playNextInQueue();
  }

  private playNextInQueue(): void {
    if (this.animationQueue.length === 0) return;

    if (this.queueMode === QueueMode.SHUFFLE) {
      this.currentQueueIndex = Math.floor(Math.random() * this.animationQueue.length);
    }

    const nextId = this.animationQueue[this.currentQueueIndex];
    
    // Play with LoopOnce so the 'finished' event triggers
    this.play(nextId, { loop: THREE.LoopOnce, repetitions: 1, fadeDuration: 0.3 });

    // Advance index
    if (this.queueMode === QueueMode.SEQUENTIAL && this.currentQueueIndex >= this.animationQueue.length - 1) {
      // Reached the end, do nothing
    } else {
      this.currentQueueIndex = (this.currentQueueIndex + 1) % this.animationQueue.length;
    }
  }

  // --- Utility Adjustments ---

  public setPlaybackSpeed(speed: number): void {
    this.mixer.timeScale = speed;
  }

  public setLoop(id: string, mode: THREE.AnimationActionLoopStyles, repetitions: number = Infinity): void {
    const action = this.actions.get(id);
    if (action) action.setLoop(mode, repetitions);
  }

  public setWeight(id: string, weight: number): void {
    const action = this.actions.get(id);
    if (action) action.setEffectiveWeight(weight);
  }

  // --- Event Handlers ---

  private onFinished(e: any): void {
    if (e.action === this.currentAction) {
      this.state = PlaybackState.FINISHED;
      
      // Auto-advance queue if active
      if (this.queueMode !== QueueMode.MANUAL && this.animationQueue.length > 0) {
        // Prevent immediate crossFade popping by waiting a tick
        requestAnimationFrame(() => this.playNextInQueue());
      }
    }
  }

  private onLoop(e: any): void {
    // Fired every time a loop completes. Useful for triggering SFX or step events.
  }

  // --- Memory Management ---

  public clear(): void {
    this.stop();
    this.actions.clear();
    this.clips.clear();
    this.animationQueue = [];
    this.currentQueueIndex = -1;
  }

  public dispose(): void {
    this.clear();
    this.mixer.removeEventListener("finished", this.onFinished);
    this.mixer.removeEventListener("loop", this.onLoop);
    this.mixer.uncacheRoot(this.root);
  }

  public update(delta: number): void {
    if (this.state !== PlaybackState.PAUSED) {
      this.mixer.update(delta);
    }
  }
}