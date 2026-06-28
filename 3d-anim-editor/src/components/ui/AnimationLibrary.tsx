"use client";

import { useState, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Play, Trash2, Plus, PlusSquare } from "lucide-react";
import { exportClipToJSON, cn } from "@/lib/utils";

export function AnimationLibrary() {
  const { 
    animations, activeAnimationId, addAnimation, 
    removeAnimation, setActiveAnimationId, addToSequence 
  } = useEditorStore();
  
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
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

          addAnimation({
            id: crypto.randomUUID(),
            name,
            duration: clip.duration,
            clip
          });
        });
      } catch (err) {
        console.error("Failed to load animation:", err);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    setIsUploading(false);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-300 font-medium"
      >
        <Plus className="w-4 h-4" />
        {isUploading ? "Extracting..." : "Add Animations"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".fbx"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />

      <div className="space-y-2">
        <AnimatePresence>
          {animations.map((anim) => {
            const isActive = activeAnimationId === anim.id;
            return (
              <motion.div
                key={anim.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                  isActive 
                    ? "bg-violet-500/10 border-violet-500/50" 
                    : "bg-[#18181F] border-white/5 hover:border-white/20"
                )}
                onClick={() => setActiveAnimationId(anim.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Play className={cn("w-3 h-3 shrink-0", isActive ? "text-violet-400" : "text-gray-500")} />
                  <div className="flex flex-col truncate">
                    <span className="text-xs text-gray-200 truncate">{anim.name}</span>
                    <span className="text-[10px] text-gray-500">{anim.duration.toFixed(2)}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* NEW: Add to Sequence Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); addToSequence(anim.id); }}
                    className="p-1.5 rounded-md hover:bg-violet-500/20 text-gray-400 hover:text-violet-400"
                    title="Add to Sequence"
                  >
                    <PlusSquare className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); exportClipToJSON(anim.clip); }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
                    title="Export JSON"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAnimation(anim.id); }}
                    className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}