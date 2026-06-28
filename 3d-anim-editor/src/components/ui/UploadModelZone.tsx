"use client";

import { useState, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadModelZone() {
  const [isDragging, setIsDragging] = useState(false);
  const { modelFile, setModelFile } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".fbx")) setModelFile(file);
  };

  return (
    <motion.div
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center p-6 border border-dashed rounded-xl cursor-pointer transition-colors duration-200",
        isDragging ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
        modelFile && "border-green-500/50 bg-green-500/5"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".fbx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setModelFile(file);
        }}
      />
      
      <AnimatePresence mode="wait">
        {modelFile ? (
          <motion.div key="loaded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <CheckCircle2 className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-xs text-gray-300 font-medium truncate max-w-[200px]">{modelFile.name}</p>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
            <p className="text-xs text-gray-300 font-medium">Drop model .fbx</p>
            <p className="text-[10px] text-gray-500 mt-1">or click to browse</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}