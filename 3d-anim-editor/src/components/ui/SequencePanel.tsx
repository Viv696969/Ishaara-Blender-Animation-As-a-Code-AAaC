"use client";

import { useEffect, useState, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { SequencePlayer } from "@/lib/animation/SequencePlayer";
import { Play, Square, GripVertical, Trash2, ListTree } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function SequencePanel() {
  const { controller, animations, sequenceItems, removeFromSequence, reorderSequence } = useEditorStore();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playerRef = useRef<SequencePlayer | null>(null);

  useEffect(() => {
    if (!controller) return;
    
    const player = new SequencePlayer(controller);
    
    player.onSequenceProgress = (idx) => setPlayingIndex(idx);
    player.onSequenceComplete = () => {
      setIsPlaying(false);
      setPlayingIndex(null);
    };
    
    playerRef.current = player;

    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [controller]);

  const handlePlaySequence = () => {
    if (!playerRef.current || sequenceItems.length === 0) return;
    setIsPlaying(true);
    // Maps the sequence item back to the original animation ID for the controller
    playerRef.current.play(sequenceItems.map(item => item.animId), 0.4);
  };

  const handleStopSequence = () => {
    if (!playerRef.current) return;
    playerRef.current.stop();
    setIsPlaying(false);
    setPlayingIndex(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIdx) {
      reorderSequence(draggedIdx, targetIdx);
    }
    setDraggedIdx(null);
  };

  if (sequenceItems.length === 0) return null;

  return (
    <div className="mt-8 border-t border-white/5 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <ListTree className="w-3 h-3" /> Sequence
        </h2>
        
        {isPlaying ? (
          <button onClick={handleStopSequence} className="text-red-400 hover:text-red-300 transition-colors p-1">
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button onClick={handlePlaySequence} className="text-violet-400 hover:text-violet-300 transition-colors p-1">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {sequenceItems.map((item, idx) => {
            const originalAnim = animations.find(a => a.id === item.animId);
            if (!originalAnim) return null;
            
            const isCurrentlyPlaying = playingIndex === idx;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                draggable
                onDragStart={(e) => handleDragStart(e as any, idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e as any, idx)}
                className={cn(
                  "group flex items-center p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing",
                  isCurrentlyPlaying ? "bg-violet-500/20 border-violet-500/50" : "bg-[#18181F] border-white/5 hover:border-white/20",
                  draggedIdx === idx ? "opacity-50" : "opacity-100"
                )}
              >
                <div className="p-1 mr-1 text-gray-600 group-hover:text-gray-400">
                  <GripVertical className="w-3 h-3" />
                </div>
                
                <div className="flex-1 flex flex-col truncate pr-2">
                  <span className={cn("text-xs truncate", isCurrentlyPlaying ? "text-violet-300 font-medium" : "text-gray-300")}>
                    {originalAnim.name}
                  </span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); removeFromSequence(item.id); }}
                  className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}