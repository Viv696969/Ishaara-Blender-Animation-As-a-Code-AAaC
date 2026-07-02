"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { UploadModelZone } from "./UploadModelZone";
import { AnimationLibrary } from "./AnimationLibrary";
import { SequencePanel } from "./SequencePanel";

export function Sidebar() {
  const modelFile = useEditorStore((state) => state.modelFile);

  return (
    <aside className="w-80 h-full bg-[var(--bg-panel)]/95 backdrop-blur-xl border-r border-[var(--border-subtle)] flex flex-col z-10 shadow-2xl">
      <div className="p-6 flex items-center gap-3 border-b border-[var(--border-subtle)]">
        <div className="w-2 h-2 rounded-full bg-[var(--text-primary)]" />
        <h1 className="font-serif text-xl tracking-wide text-[var(--text-primary)]">
          Animation Studio
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-thin">
        <section>
          <h2 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">
            Target Model
          </h2>
          <UploadModelZone />
        </section>

        <section className={!modelFile ? "opacity-30 pointer-events-none transition-opacity duration-500" : "transition-opacity duration-500"}>
          <h2 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">
            Animation Library
          </h2>
          <AnimationLibrary />
          
          <SequencePanel />
        </section>
      </div>
    </aside>
  );
}