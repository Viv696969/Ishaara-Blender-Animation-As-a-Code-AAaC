"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { Play, Pause, Square, SkipBack, SkipForward, GripVertical, Trash2 } from "lucide-react";
import { PlaybackState } from "@/lib/animation/types";
import { Reorder } from "framer-motion";
import { cn } from "@/lib/utils";

export function SequenceEditorPanel() {
  const { 
    controller, library, sequence, activeSequenceIndex, setActiveSequenceIndex,
    playbackState, blendDuration, setBlendDuration, reorderSequence, removeFromSequence, clearSequence
  } = useEditorStore();

  const handlePlay = () => {
    if (!controller || sequence.length === 0) return;
    if (playbackState === PlaybackState.PAUSED) {
      controller.resumeSequence();
    } else {
      // Map sequence items to their underlying animation IDs
      const animIds = sequence.map(item => item.animationId);
      controller.playSequence(animIds, blendDuration, 0, (idx) => {
        setActiveSequenceIndex(idx);
      });
    }
  };

  const handleStop = () => controller?.stopSequence();
  const handlePause = () => controller?.pauseSequence();
  const handleNext = () => controller?.skipNext();
  const handlePrev = () => controller?.skipPrevious();

  return (
    <div className="absolute bottom-0 left-72 right-0 bg-[#0B0F14] border-t border-white/10 flex flex-col z-20 shadow-2xl h-52">
      {/* NLA Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#111827]">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"><SkipBack className="w-4 h-4 fill-current" /></button>
          <button onClick={handleStop} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"><Square className="w-4 h-4 fill-current" /></button>
          <button onClick={playbackState === PlaybackState.PLAYING ? handlePause : handlePlay} className="p-1.5 text-violet-400 hover:text-violet-300 rounded hover:bg-violet-500/20 transition-colors">
            {playbackState === PlaybackState.PLAYING ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button onClick={handleNext} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"><SkipForward className="w-4 h-4 fill-current" /></button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium tracking-wide">Blend: {blendDuration.toFixed(1)}s</span>
            <input 
              type="range" min="0" max="2" step="0.1" value={blendDuration}
              onChange={(e) => setBlendDuration(parseFloat(e.target.value))}
              className="w-24 accent-violet-500 h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
          <button onClick={clearSequence} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 tracking-wider">Clear Seq</button>
        </div>
      </div>

      {/* NLA Track (Horizontal scrolling Sequence) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 scrollbar-thin flex items-center bg-[#0B0F14]/50">
        {sequence.length === 0 ? (
          <div className="w-full text-center text-sm text-gray-600 font-medium">Add animations from the library to build a sequence.</div>
        ) : (
          <Reorder.Group axis="x" values={sequence} onReorder={reorderSequence} className="flex gap-2 h-full items-center">
            {sequence.map((item, idx) => {
              const anim = library.find(a => a.id === item.animationId);
              if (!anim) return null;
              
              const isPlaying = activeSequenceIndex === idx;

              return (
                <Reorder.Item 
                  key={item.instanceId} 
                  value={item} 
                  className={cn(
                    "relative h-24 min-w-[160px] rounded-lg border flex flex-col justify-between p-3 cursor-grab active:cursor-grabbing transition-colors",
                    isPlaying ? "bg-violet-900/40 border-violet-500" : "bg-[#18181F] border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <GripVertical className="w-4 h-4 text-gray-600" />
                    <button onClick={() => removeFromSequence(item.instanceId)} className="text-gray-600 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-semibold truncate", isPlaying ? "text-violet-300" : "text-gray-200")}>{anim.name}</span>
                    <span className="text-[10px] text-gray-500">{anim.duration.toFixed(2)}s</span>
                  </div>

                  {/* Playhead indicator */}
                  {isPlaying && (
                    <div className="absolute top-0 left-0 h-1 bg-violet-400 w-full rounded-t-lg animate-pulse" />
                  )}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}