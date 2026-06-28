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
          const isGenericName = !clip.name || clip.name.toLowerCase() === "scene" || clip.name === "mixamo.com" || clip.name.includes("Armature|");
          const baseName = file.name.replace(".fbx", "");
          const name = isGenericName ? `${baseName}${fbx.animations.length > 1 ? `_${i}` : ""}` : clip.name;

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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-colors text-xs text-[var(--text-primary)] font-medium"
      >
        <Plus className="w-4 h-4" />
        {isUploading ? "Extracting..." : "Add Animations"}
      </button>
      <input ref={inputRef} type="file" accept=".fbx" multiple className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />

      <div className="space-y-2">
        <AnimatePresence>
          {animations.map((anim) => {
            const isActive = activeAnimationId === anim.id;
            return (
              <motion.div
                key={anim.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer duration-300",
                  isActive 
                    ? "bg-[var(--text-primary)] border-[var(--text-primary)]" 
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--text-primary)]/30"
                )}
                onClick={() => setActiveAnimationId(anim.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Play className={cn("w-3 h-3 shrink-0", isActive ? "text-[var(--text-inverse)] fill-current" : "text-[var(--text-secondary)]")} />
                  <div className="flex flex-col truncate">
                    <span className={cn("text-xs truncate font-medium", isActive ? "text-[var(--text-inverse)]" : "text-[var(--text-primary)]")}>{anim.name}</span>
                    <span className={cn("text-[10px]", isActive ? "text-[var(--text-inverse)]/60" : "text-[var(--text-secondary)]")}>{anim.duration.toFixed(2)}s</span>
                  </div>
                </div>

                {/* FIX: Buttons are always rendered but at 30% opacity, fading to 100% on hover */}
                <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); addToSequence(anim.id); }} className={cn("p-1.5 rounded-md transition-colors", isActive ? "hover:bg-black/10 text-[var(--text-inverse)]" : "hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}>
                    <PlusSquare className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); exportClipToJSON(anim.clip); }} className={cn("p-1.5 rounded-md transition-colors", isActive ? "hover:bg-black/10 text-[var(--text-inverse)]" : "hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}>
                    <Download className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeAnimation(anim.id); }} className={cn("p-1.5 rounded-md transition-colors", isActive ? "hover:bg-[var(--color-danger)]/10 text-[var(--color-danger)]" : "hover:bg-[var(--color-danger)]/10 text-[var(--text-secondary)] hover:text-[var(--color-danger)]")}>
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