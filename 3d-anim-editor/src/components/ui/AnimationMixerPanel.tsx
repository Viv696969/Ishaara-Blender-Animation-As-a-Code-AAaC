"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { Play, Pause, Square, SkipBack, SkipForward, Repeat, Repeat1 } from "lucide-react";
import { PlaybackState } from "@/lib/animation/types";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export function AnimationMixerPanel() {
  const { 
    controller, animations, activeAnimationId, playbackState, 
    speed, setSpeed, blendDuration, setBlendDuration, 
    loopMode, setLoopMode 
  } = useEditorStore();
  
  const scrubberRef = useRef<HTMLInputElement>(null);
  const activeAnim = animations.find(a => a.id === activeAnimationId);

  // 60FPS Scrubber Sync (Bypasses React State for performance)
  useEffect(() => {
    let rafId: number;
    const updateScrubber = () => {
      if (controller?.currentAction && scrubberRef.current) {
        const action = controller.currentAction;
        const duration = action.getClip().duration;
        const progress = (action.time % duration) / duration;
        scrubberRef.current.value = (progress * 100).toString();
      }
      rafId = requestAnimationFrame(updateScrubber);
    };
    rafId = requestAnimationFrame(updateScrubber);
    return () => cancelAnimationFrame(rafId);
  }, [controller]);

  const handlePlayPause = () => {
    if (!controller || !activeAnimationId) return;
    if (playbackState === PlaybackState.PLAYING) {
      controller.pause();
    } else if (playbackState === PlaybackState.PAUSED) {
      controller.resume();
    } else {
      controller.play(activeAnimationId, { fadeDuration: blendDuration, loop: loopMode });
    }
  };

  const handleStop = () => {
    controller?.stop();
    if (scrubberRef.current) scrubberRef.current.value = "0";
  };

  const playAdjacent = (direction: 1 | -1) => {
    if (!controller || animations.length === 0) return;
    const currentIndex = animations.findIndex(a => a.id === activeAnimationId);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = animations.length - 1;
    if (nextIndex >= animations.length) nextIndex = 0;
    
    useEditorStore.getState().setActiveAnimationId(animations[nextIndex].id);
  };

  if (!controller) return null;

  return (
    <div className="absolute bottom-0 left-80 right-0 bg-[#111827]/95 backdrop-blur-2xl border-t border-white/5 flex flex-col z-20 shadow-2xl">
      {/* Scrubber Timeline */}
      <div className="h-1.5 w-full bg-white/5 relative group cursor-pointer">
        <input 
          ref={scrubberRef}
          type="range" 
          min="0" max="100" step="0.1" 
          defaultValue="0"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={(e) => {
            if (controller?.currentAction) {
              const duration = controller.currentAction.getClip().duration;
              controller.currentAction.time = (parseFloat(e.target.value) / 100) * duration;
            }
          }}
        />
        <div 
          className="h-full bg-violet-500 origin-left" 
          style={{ width: scrubberRef.current?.value ? `${scrubberRef.current.value}%` : '0%' }} 
        />
      </div>

      <div className="p-4 px-6 flex items-center justify-between">
        {/* Playback Status */}
        <div className="flex items-center gap-3 w-48">
          <div className={cn(
            "w-2 h-2 rounded-full",
            playbackState === PlaybackState.PLAYING ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" :
            playbackState === PlaybackState.TRANSITIONING ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" :
            playbackState === PlaybackState.PAUSED ? "bg-orange-500" : "bg-gray-600"
          )} />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{playbackState}</span>
            <span className="text-xs text-white truncate max-w-[150px]">{activeAnim ? activeAnim.name : "No Action"}</span>
          </div>
        </div>

        {/* Core Controls */}
        <div className="flex items-center gap-4">
          <button onClick={() => playAdjacent(-1)} className="text-gray-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button onClick={handleStop} className="text-gray-400 hover:text-white transition-colors">
            <Square className="w-5 h-5 fill-current" />
          </button>
          <button 
            onClick={handlePlayPause}
            className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
          >
            {playbackState === PlaybackState.PLAYING ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>
          <button onClick={() => playAdjacent(1)} className="text-gray-400 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
          <button 
            onClick={() => {
              const newMode = loopMode === THREE.LoopRepeat ? THREE.LoopOnce : THREE.LoopRepeat;
              setLoopMode(newMode);
              if (activeAnimationId) controller.setLoop(activeAnimationId, newMode);
            }}
            className={cn("transition-colors ml-2", loopMode === THREE.LoopRepeat ? "text-violet-400" : "text-gray-600")}
          >
            {loopMode === THREE.LoopRepeat ? <Repeat className="w-4 h-4" /> : <Repeat1 className="w-4 h-4" />}
          </button>
        </div>

        {/* Engine Settings */}
        <div className="flex items-center gap-6 w-48 justify-end">
          <div className="flex flex-col gap-1 w-24">
            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest flex justify-between">
              Speed <span>{speed.toFixed(1)}x</span>
            </span>
            <input 
              type="range" min="0.1" max="2" step="0.1" value={speed}
              onChange={(e) => {
                const s = parseFloat(e.target.value);
                setSpeed(s);
                controller.setPlaybackSpeed(s);
              }}
              className="accent-violet-500 h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
          <div className="flex flex-col gap-1 w-24">
            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest flex justify-between">
              Blend <span>{blendDuration.toFixed(1)}s</span>
            </span>
            <input 
              type="range" min="0" max="2" step="0.1" value={blendDuration}
              onChange={(e) => setBlendDuration(parseFloat(e.target.value))}
              className="accent-blue-500 h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}