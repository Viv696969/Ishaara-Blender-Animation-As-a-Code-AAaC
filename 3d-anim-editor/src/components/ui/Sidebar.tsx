"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { UploadModelZone } from "./UploadModelZone";
import { AnimationLibrary } from "./AnimationLibrary";
import { SequencePanel } from "./SequencePanel";
import { Box } from "lucide-react";

export function Sidebar() {
  const modelFile = useEditorStore((state) => state.modelFile);

  return (
    <aside className="w-80 h-full bg-[#111827]/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-10 shadow-2xl">
      <div className="p-5 flex items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Box className="w-4 h-4 text-white" />
        </div>
        <h1 className="font-semibold text-sm tracking-wide text-white">
          FBX Studio
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
        <section>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Target Model
          </h2>
          <UploadModelZone />
        </section>

        <section className={!modelFile ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Animation Library
          </h2>
          <AnimationLibrary />
          
          {/* NEW: Appended directly below library */}
          <SequencePanel />
        </section>
      </div>
    </aside>
  );
}