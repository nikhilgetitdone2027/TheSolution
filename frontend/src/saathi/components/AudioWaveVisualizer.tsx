import { useEffect, useState, useMemo } from "react";
import type { AvatarState } from "../avatar/AvatarController";

interface AudioWaveVisualizerProps {
  isSpeaking: boolean;
  audioLevel?: number;
  state?: AvatarState;
  className?: string;
}

const BAR_COUNT = 28;

export function AudioWaveVisualizer({
  isSpeaking,
  audioLevel = 0,
  state = "idle",
  className = "",
}: AudioWaveVisualizerProps) {
  const [scales, setScales] = useState<number[]>(() =>
    new Array(BAR_COUNT).fill(0.12)
  );

  // Formant spectral envelope for natural speech frequencies
  const formants = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const f1 = Math.exp(-Math.pow((i - 7) / 4.2, 2)) * 0.95;
      const f2 = Math.exp(-Math.pow((i - 16) / 5.0, 2)) * 0.8;
      const f3 = Math.exp(-Math.pow((i - 23) / 3.8, 2)) * 0.6;
      return Math.max(f1, f2, f3, 0.15);
    });
  }, []);

  useEffect(() => {
    const isReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isReduced) {
      setScales(new Array(BAR_COUNT).fill(0.2));
      return;
    }

    let phase = 0;

    const interval = window.setInterval(() => {
      phase += isSpeaking ? 0.28 : 0.08;

      setScales(() => {
        const next = new Array(BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          if (isSpeaking) {
            const wave =
              Math.sin(phase * 2.1 + i * 0.45) * Math.cos(phase * 1.5 - i * 0.3);
            const dynamicAmp =
              Math.max(0.18, Math.abs(wave)) * (0.45 + (audioLevel || 0.45) * 0.6);
            next[i] = Math.min(1.0, Math.max(0.12, formants[i] * dynamicAmp * 1.1));
          } else if (state === "listening") {
            const ripple = 0.22 + Math.sin(phase * 1.2 + i * 0.38) * 0.15;
            next[i] = Math.max(0.1, ripple);
          } else if (state === "thinking") {
            const scan = Math.exp(-Math.pow((i - ((phase * 3.5) % BAR_COUNT)) / 2.8, 2));
            next[i] = Math.max(0.1, 0.15 + scan * 0.7);
          } else {
            // Idle gentle breathing baseline
            const idle = 0.12 + Math.sin(phase * 0.6 + i * 0.25) * 0.05;
            next[i] = Math.max(0.08, idle);
          }
        }
        return next;
      });
    }, 70); // ~14 updates/sec driving smooth CSS spring transitions

    return () => {
      window.clearInterval(interval);
    };
  }, [isSpeaking, audioLevel, state, formants]);

  // Color scheme based on state
  const colors = useMemo(() => {
    if (state === "listening") {
      return {
        bg: "from-amber-400 via-amber-500 to-amber-400",
        shadow: "rgba(245, 158, 11, 0.4)",
        border: "border-amber-500/30",
      };
    }
    if (state === "thinking") {
      return {
        bg: "from-cyan-400 via-sky-500 to-cyan-400",
        shadow: "rgba(6, 182, 212, 0.4)",
        border: "border-cyan-500/30",
      };
    }
    if (state === "error") {
      return {
        bg: "from-rose-400 via-red-500 to-rose-400",
        shadow: "rgba(239, 68, 68, 0.4)",
        border: "border-red-500/30",
      };
    }
    return {
      bg: "from-emerald-400 via-teal-500 to-emerald-400",
      shadow: "rgba(16, 185, 129, 0.4)",
      border: "border-emerald-500/30",
    };
  }, [state]);

  return (
    <div
      className={`relative flex h-8 w-full items-center justify-center overflow-hidden rounded-lg bg-[#0b0f17]/90 px-3 py-1.5 backdrop-blur-md border ${colors.border} ${className}`}
      style={{
        boxShadow: isSpeaking ? `0 0 16px ${colors.shadow}` : "none",
      }}
    >
      {/* Central Guide Line */}
      <div className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-white/10" />

      {/* Spring-driven CSS transform bars */}
      <div className="relative flex h-full w-full items-center justify-between gap-[3px]">
        {scales.map((scale, i) => (
          <span
            key={i}
            className={`h-full flex-1 rounded-full bg-gradient-to-b ${colors.bg}`}
            style={{
              transform: `translate3d(0,0,0) scaleY(${Math.max(0.08, scale)})`,
              transformOrigin: "center center",
              transition:
                "transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease",
              opacity: isSpeaking ? 0.95 : 0.65,
              willChange: "transform",
            }}
          />
        ))}
      </div>
    </div>
  );
}
