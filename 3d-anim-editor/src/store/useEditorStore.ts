import { create } from 'zustand';
import * as THREE from 'three';
import { AnimationController } from '@/lib/animation/AnimationController';
import { PlaybackState, QueueMode } from '@/lib/animation/types';

export interface EditorAnimation {
  id: string;
  name: string;
  duration: number;
  clip: THREE.AnimationClip;
}

export interface SequenceItem {
  id: string; 
  animId: string; 
}

interface EditorState {
  modelFile: File | null;
  setModelFile: (file: File | null) => void;
  
  controller: AnimationController | null;
  setController: (ctrl: AnimationController | null) => void;

  animations: EditorAnimation[];
  activeAnimationId: string | null;

  // --- Mixer State (This was missing!) ---
  playbackState: PlaybackState;
  setPlaybackState: (state: PlaybackState) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  blendDuration: number;
  setBlendDuration: (duration: number) => void;
  loopMode: THREE.AnimationActionLoopStyles;
  setLoopMode: (mode: THREE.AnimationActionLoopStyles) => void;
  queueMode: QueueMode;
  setQueueMode: (mode: QueueMode) => void;
  
  // --- Standard Actions ---
  addAnimation: (anim: EditorAnimation) => void;
  removeAnimation: (id: string) => void;
  setActiveAnimationId: (id: string | null) => void;
  reorderAnimations: (startIndex: number, endIndex: number) => void;

  // --- Sequence State & Actions ---
  sequenceItems: SequenceItem[];
  addToSequence: (animId: string) => void;
  removeFromSequence: (id: string) => void;
  reorderSequence: (startIndex: number, endIndex: number) => void;
  clearSequence: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  modelFile: null,
  setModelFile: (file) => set({ modelFile: file, animations: [], activeAnimationId: null, sequenceItems: [] }),
  
  controller: null,
  setController: (ctrl) => set({ controller: ctrl }),

  animations: [],
  activeAnimationId: null,

  // --- Initialize Mixer State (This fixes the error!) ---
  playbackState: PlaybackState.IDLE,
  setPlaybackState: (state) => set({ playbackState: state }),
  speed: 1.0,
  setSpeed: (speed) => set({ speed }),
  blendDuration: 0.2, // CHANGED from 0.4 for much smoother transitions
  setBlendDuration: (blendDuration) => set({ blendDuration }),
  loopMode: THREE.LoopRepeat,
  setLoopMode: (loopMode) => set({ loopMode }),
  queueMode: QueueMode.MANUAL,
  setQueueMode: (queueMode) => set({ queueMode }),
  
  // --- Actions ---
  addAnimation: (anim) => set((state) => ({ 
    animations: [...state.animations, anim] 
  })),
  
  removeAnimation: (id) => set((state) => ({
    animations: state.animations.filter((a) => a.id !== id),
    activeAnimationId: state.activeAnimationId === id ? null : state.activeAnimationId,
    sequenceItems: state.sequenceItems.filter((s) => s.animId !== id)
  })),
  
  setActiveAnimationId: (id) => set({ activeAnimationId: id }),
  
  reorderAnimations: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.animations);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { animations: result };
  }),

  // --- Sequence Implementations ---
  sequenceItems: [],
  addToSequence: (animId) => set((state) => ({
    sequenceItems: [...state.sequenceItems, { id: crypto.randomUUID(), animId }]
  })),
  removeFromSequence: (id) => set((state) => ({
    sequenceItems: state.sequenceItems.filter((item) => item.id !== id)
  })),
  reorderSequence: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.sequenceItems);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { sequenceItems: result };
  }),
  clearSequence: () => set({ sequenceItems: [] })
}));