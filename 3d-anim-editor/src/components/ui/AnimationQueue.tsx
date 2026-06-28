"use client";

import { useState, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, GripVertical, ListOrdered, Shuffle, ArrowRight } from "lucide-react";
import { QueueMode } from "@/lib/animation/types";
import { cn } from "@/lib/utils";

export function AnimationQueue() {
  const { 
    animations, activeAnimationId, addAnimation, setActiveAnimationId, 
    reorderAnimations, queueMode, setQueueMode, controller 
  } = useEditorStore();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleFileUpload = async (files: FileList) => {
    const fbxFiles = Array.from(files).filter(f => f.name.endsWith(".fbx"));
    for (const file of fbxFiles) {
      const url = URL.createObjectURL(file);
      const loader = new FBXLoader();
      try {
        const fbx = await loader.loadAsync(url);
        fbx.animations.forEach((clip, i) => {
          const name = (!clip.name || clip.name === "mixamo.com") 
            ? `${file.name.replace(".fbx", "")}${fbx.animations.length > 1 ? `_${i}` : ""}` 
            : clip.name;
          addAnimation({ id: crypto.randomUUID(), name, duration: clip.duration, clip });
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIdx) {
      reorderAnimations(draggedIdx, targetIdx);
    }
    setDraggedIdx(null);
  };

  return (
    <div className="space-y-4">
      {/* Queue Mode Controls */}
      <div className="flex bg-[#18181F] p-1 rounded-lg border border-white/5">
        {[
          { mode: QueueMode.MANUAL, icon: Play, label: "Manual" },
          { mode: QueueMode.SEQUENTIAL, icon: ArrowRight, label: "Seq" },
          { mode: QueueMode.LOOP_ALL, icon: ListOrdered, label: "Loop" },
          { mode: QueueMode.SHUFFLE, icon: Shuffle, label: "Shuf" }
        ].map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => {
              setQueueMode(mode);
              controller?.queue(animations.map(a => a.id), mode);
              if (mode !== QueueMode.MANUAL) controller?.playSequence();
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-all",
              queueMode === mode ? "bg-violet-600/20 text-violet-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            )}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-300 font-medium"
      >
        <Plus className="w-4 h-4" /> Add to Queue
      </button>
      <input
        ref={inputRef}
        type="file" accept=".fbx" multiple className="hidden"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />

      <div className="space-y-2">
        <AnimatePresence>
          {animations.map((anim, idx) => {
            const isActive = activeAnimationId === anim.id;
            return (
              <motion.div
                key={anim.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                draggable onDragStart={(e) => handleDragStart(e as any, idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e as any, idx)}
                className={cn(
                  "group flex items-center p-2 rounded-lg border transition-all cursor-pointer",
                  isActive ? "bg-violet-500/10 border-violet-500/50" : "bg-[#18181F] border-white/5 hover:border-white/20",
                  draggedIdx === idx ? "opacity-50" : "opacity-100"
                )}
                onClick={() => setActiveAnimationId(anim.id)}
              >
                <div className="cursor-grab active:cursor-grabbing p-1 mr-1 text-gray-600 group-hover:text-gray-400">
                  <GripVertical className="w-3 h-3" />
                </div>
                <div className="flex-1 flex flex-col truncate pr-2">
                  <span className={cn("text-xs truncate", isActive ? "text-violet-300 font-medium" : "text-gray-300")}>{anim.name}</span>
                  <span className="text-[10px] text-gray-500">{anim.duration.toFixed(2)}s</span>
                </div>
                {isActive && (
                  <motion.div layoutId="playing-indicator" className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}