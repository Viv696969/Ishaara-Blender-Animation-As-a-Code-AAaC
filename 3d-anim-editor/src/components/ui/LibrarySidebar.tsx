"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { Plus, Box, UploadCloud } from "lucide-react";
import { UploadModelZone } from "./UploadModelZone";

export function LibrarySidebar() {
  const { library, addToLibrary, addToSequence, modelFile } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    const fbxFiles = Array.from(files).filter(f => f.name.endsWith(".fbx"));
    
    for (const file of fbxFiles) {
      const url = URL.createObjectURL(file);
      const loader = new FBXLoader();
      try {
        const fbx = await loader.loadAsync(url);
        fbx.animations.forEach((clip, i) => {
          addToLibrary({
            id: crypto.randomUUID(),
            name: clip.name === "mixamo.com" || !clip.name ? `${file.name.replace(".fbx", "")}_${i}` : clip.name,
            duration: clip.duration,
            clip
          });
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    setIsUploading(false);
  };

  return (
    <aside className="w-72 h-full bg-[#111827] border-r border-white/5 flex flex-col z-10">
      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-violet-600 flex items-center justify-center">
          <Box className="w-4 h-4 text-white" />
        </div>
        <h1 className="font-semibold text-sm text-white">FBX Studio</h1>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto scrollbar-thin">
        <section>
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Model</h2>
          <UploadModelZone />
        </section>

        <section className={!modelFile ? "opacity-50 pointer-events-none" : ""}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Library</h2>
            <button 
              onClick={() => inputRef.current?.click()}
              className="text-violet-400 hover:text-violet-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <UploadCloud className="w-3 h-3" /> Upload
            </button>
            <input ref={inputRef} type="file" accept=".fbx" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          </div>

          <div className="space-y-1">
            {isUploading && <div className="text-xs text-gray-500 text-center py-2">Extracting...</div>}
            {library.map((anim) => (
              <div key={anim.id} className="group flex items-center justify-between p-2 rounded border border-transparent hover:border-white/10 hover:bg-white/5 transition-all">
                <div className="flex flex-col truncate pr-2">
                  <span className="text-xs text-gray-300 truncate">{anim.name}</span>
                  <span className="text-[10px] text-gray-500">{anim.duration.toFixed(2)}s</span>
                </div>
                <button 
                  onClick={() => addToSequence(anim.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 bg-violet-600 hover:bg-violet-500 rounded text-white transition-all"
                  title="Add to Sequence"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}