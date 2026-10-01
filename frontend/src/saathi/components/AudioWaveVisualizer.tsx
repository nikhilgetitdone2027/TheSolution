import { useEffect, useRef } from "react";
import type { AvatarState } from "../avatar/AvatarController";

interface AudioWaveVisualizerProps {
  isSpeaking: boolean;
  audioLevel?: number;
  state?: AvatarState;
  className?: string;
}

export function AudioWaveVisualizer({
  isSpeaking,
  audioLevel = 0,
  state = "idle",
  className = "",
}: AudioWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const barHeightsRef = useRef<number[]>(new Array(32).fill(0));
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const checkReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const barCount = 32;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      phaseRef.current += isSpeaking ? 0.18 : 0.04;
      const phase = phaseRef.current;
      const barWidth = (w / barCount) * 0.65;
      const gap = (w / barCount) * 0.35;
      const centerY = h * 0.5;

      // Color scheme based on active state
      let primaryColor = "#10b981"; // emerald-500
      let secondaryColor = "#34d399"; // emerald-400
      let glowColor = "rgba(16, 185, 129, 0.45)";

      if (state === "listening") {
        primaryColor = "#f59e0b"; // amber-500
        secondaryColor = "#fbbf24";
        glowColor = "rgba(245, 158, 11, 0.4)";
      } else if (state === "thinking") {
        primaryColor = "#06b6d4"; // cyan-500
        secondaryColor = "#38bdf8";
        glowColor = "rgba(6, 182, 212, 0.4)";
      } else if (state === "error") {
        primaryColor = "#ef4444";
        secondaryColor = "#f87171";
        glowColor = "rgba(239, 68, 68, 0.4)";
      }

      const gradient = ctx.createLinearGradient(0, centerY - h * 0.4, 0, centerY + h * 0.4);
      gradient.addColorStop(0, secondaryColor);
      gradient.addColorStop(0.5, primaryColor);
      gradient.addColorStop(1, secondaryColor);

      ctx.fillStyle = gradient;
      ctx.shadowBlur = isSpeaking ? 10 * dpr : 4 * dpr;
      ctx.shadowColor = glowColor;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap) + gap * 0.5;
        let targetHeight = 2 * dpr; // baseline idle height

        if (isSpeaking && !checkReducedMotion) {
          // Acoustic formant simulation: energy centered around vowels / voice bands
          const formant1 = Math.exp(-Math.pow((i - 8) / 4.5, 2)) * 0.9;
          const formant2 = Math.exp(-Math.pow((i - 18) / 5.5, 2)) * 0.75;
          const formant3 = Math.exp(-Math.pow((i - 26) / 4.0, 2)) * 0.55;
          const spectralEnvelope = Math.max(formant1, formant2, formant3, 0.15);

          const wave = Math.sin(phase * 2.2 + i * 0.42) * Math.cos(phase * 1.4 - i * 0.28);
          const dynamicAmp = Math.max(0.12, Math.abs(wave)) * (0.4 + (audioLevel || 0.4) * 0.6);
          targetHeight = Math.max(3 * dpr, spectralEnvelope * dynamicAmp * (h * 0.85));
        } else if (state === "listening" && !checkReducedMotion) {
          // Subtle listening ripple
          targetHeight = (2.5 + Math.sin(phase + i * 0.35) * 1.8) * dpr;
        } else if (state === "thinking" && !checkReducedMotion) {
          // Scanning pulse
          const scan = Math.exp(-Math.pow((i - ((phase * 4) % barCount)) / 3.0, 2));
          targetHeight = (2.0 + scan * 8.0) * dpr;
        } else {
          // Low-amplitude gentle baseline line with subtle micro-ripples
          targetHeight = (1.5 + Math.sin(phase * 0.5 + i * 0.2) * 0.6) * dpr;
        }

        // Smooth decay / approach
        barHeightsRef.current[i] += (targetHeight - barHeightsRef.current[i]) * (isSpeaking ? 0.35 : 0.18);
        const currentH = Math.max(1.5 * dpr, barHeightsRef.current[i]);

        // Draw symmetrical centered rounded bar
        const topY = centerY - currentH * 0.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, topY, barWidth, currentH, barWidth * 0.5);
        } else {
          ctx.rect(x, topY, barWidth, currentH);
        }
        ctx.fill();
      }

      // Draw faint baseline connecting guide
      ctx.shadowBlur = 0;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking, audioLevel, state]);

  return (
    <div className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-surface/80 px-2 py-1.5 backdrop-blur-sm border border-line/60 ${className}`}>
      <canvas ref={canvasRef} className="h-6 w-full" />
    </div>
  );
}
