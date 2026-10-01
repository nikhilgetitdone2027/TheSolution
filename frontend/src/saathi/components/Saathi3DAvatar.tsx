import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { AvatarModel, type AvatarState } from "../avatar/AvatarController";
import { AudioWaveVisualizer } from "./AudioWaveVisualizer";

interface Saathi3DAvatarProps {
  state: AvatarState;
  mouth?: number;
  size?: "full" | "small";
}

function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 1.52, 0.62);
    camera.lookAt(0, 1.48, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    camera.lookAt(0, 1.48, 0);
  });

  return null;
}

function StudioLighting() {
  return (
    <>
      {/* Baseline ambient fill */}
      <ambientLight intensity={0.65} />

      {/* Key Light: warm front-right directional */}
      <directionalLight position={[1.2, 2.2, 1.8]} intensity={1.4} color="#fff6eb" />

      {/* Soft Fill: cool front-left fill */}
      <directionalLight position={[-1.2, 1.6, 1.5]} intensity={0.75} color="#e0f2fe" />

      {/* Rim / Hair Light: strong backlight for silhouette definition against dark backgrounds */}
      <directionalLight position={[0, 2.5, -1.2]} intensity={1.1} color="#6ee7b7" />
    </>
  );
}

function AvatarFallback({ state }: { state: AvatarState }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex flex-col items-center">
        <div className="h-16 w-16 animate-pulse rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/40" />
        <span className="mt-2 text-[10px] uppercase tracking-wider text-muted">
          {state === "speaking" ? "Speaking..." : "Loading 3D..."}
        </span>
      </div>
    </div>
  );
}

export function Saathi3DAvatar({ state, mouth = 0, size = "full" }: Saathi3DAvatarProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    // Check WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }

    // Check reduced motion
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  const isSmall = size === "small";
  const heightClass = isSmall ? "h-14 w-14" : "h-64 w-full max-w-[280px]";

  if (!webglSupported) {
    // Graceful 2D fallback if hardware WebGL is unavailable
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-line bg-card/60 ${heightClass}`}>
        <img src="/saathi.jpg" alt="Saathi" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${isSmall ? "w-14" : "w-full max-w-[280px] mx-auto"}`}>
      <div
        className={`relative mx-auto overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-card/80 via-card/40 to-panel/90 shadow-lg backdrop-blur-md transition-all duration-300 ${heightClass} ${
          state === "speaking" ? "ring-2 ring-emerald-500/50 shadow-emerald-500/20" : ""
        } ${state === "listening" ? "ring-2 ring-amber-500/50 shadow-amber-500/20" : ""} ${
          state === "thinking" ? "ring-2 ring-cyan-500/50 shadow-cyan-500/20" : ""
        }`}
      >
        {/* Status glowing aura */}
        <div
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
            state === "speaking"
              ? "bg-emerald-500/10 opacity-100"
              : state === "listening"
              ? "bg-amber-500/10 opacity-100"
              : state === "thinking"
              ? "bg-cyan-500/10 opacity-100"
              : "opacity-0"
          }`}
        />

        <Canvas
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 1.45, 0.75], fov: 35 }}
          className="h-full w-full"
        >
          <CameraRig />
          <StudioLighting />
          <Suspense fallback={<AvatarFallback state={state} />}>
            <AvatarModel state={state} mouthLevel={mouth} reducedMotion={reducedMotion} />
          </Suspense>
        </Canvas>

        {/* Corner badge indicating live state */}
        {!isSmall && (
          <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-panel/80 px-2 py-0.5 text-[10px] uppercase tracking-wider backdrop-blur-md">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                state === "speaking"
                  ? "animate-pulse bg-emerald-400"
                  : state === "listening"
                  ? "animate-ping bg-amber-400"
                  : state === "thinking"
                  ? "animate-pulse bg-cyan-400"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-muted">{state}</span>
          </div>
        )}
      </div>

      {/* Real-time audio waveform visualizer beneath avatar */}
      {!isSmall && (
        <AudioWaveVisualizer
          isSpeaking={state === "speaking"}
          audioLevel={mouth}
          state={state}
          className="mt-2 w-full max-w-[280px]"
        />
      )}
    </div>
  );
}
