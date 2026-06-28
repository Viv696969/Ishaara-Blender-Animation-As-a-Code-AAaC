import { Sidebar } from "@/components/ui/Sidebar";
import { Scene } from "@/components/viewer/Scene";

export default function Home() {
  return (
    <main className="flex w-screen h-screen">
      <Sidebar />
      <div className="flex-1 relative overflow-hidden">
        <Scene />
        {/* The AnimationMixerPanel has been removed from here */}
      </div>
    </main>
  );
}