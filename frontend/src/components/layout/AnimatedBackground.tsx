import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  type: "carbon" | "catalyst" | "radical" | "cluster";
  color: string;
  bondPartner?: number;
  pulsePhase: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const checkReducedMotion = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Track mouse for gentle repel physics
    const onPointerMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
      };
    };
    const onPointerLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };
    window.addEventListener("mousemove", onPointerMove, { passive: true });
    window.addEventListener("mouseleave", onPointerLeave, { passive: true });

    // Spawn 72 micro-nodes (between 60-80) representing hydrocarbon molecules/catalyst particles
    const particleCount = 72;
    const particles: Particle[] = [];

    const colors = [
      "rgba(16, 185, 129, 0.45)", // emerald
      "rgba(14, 165, 233, 0.42)", // cyan
      "rgba(52, 211, 153, 0.38)", // light emerald
      "rgba(56, 189, 248, 0.35)", // light cyan
      "rgba(20, 184, 166, 0.40)", // teal
    ];

    const types: Particle["type"][] = ["carbon", "catalyst", "radical", "cluster"];

    for (let i = 0; i < particleCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const baseRadius =
        type === "catalyst"
          ? 2.8 + Math.random() * 1.4
          : type === "cluster"
          ? 2.2 + Math.random() * 1.0
          : 1.4 + Math.random() * 1.2;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        baseRadius,
        radius: baseRadius,
        type,
        color: colors[Math.floor(Math.random() * colors.length)],
        bondPartner: i % 4 === 0 && i > 0 ? i - 1 : undefined,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const proximityThreshold = 120; // proximity threshold < 120px
    const repelRadius = 135; // gentle mouse-repel radius
    const maxRepelSpeed = 2.6;

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      const isReduced = checkReducedMotion();
      const mouse = mouseRef.current;

      // Update particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        if (!isReduced) {
          // Brownian motion: subtle stochastic perturbation
          p.vx += (Math.random() - 0.5) * 0.04;
          p.vy += (Math.random() - 0.5) * 0.04;

          // Drag / damping to prevent excessive speeds
          p.vx *= 0.985;
          p.vy *= 0.985;

          // Gentle mouse-repel physics
          if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < repelRadius && dist > 1) {
              const repelForce = (1 - dist / repelRadius) * 4.2;
              const angle = Math.atan2(dy, dx);
              p.vx += Math.cos(angle) * repelForce * dt * 30;
              p.vy += Math.sin(angle) * repelForce * dt * 30;

              // Cap speed
              const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
              if (speed > maxRepelSpeed) {
                p.vx = (p.vx / speed) * maxRepelSpeed;
                p.vy = (p.vy / speed) * maxRepelSpeed;
              }
            }
          }

          p.x += p.vx;
          p.y += p.vy;

          // Toroidal screen wrapping with soft margin
          if (p.x < -30) p.x = width + 30;
          else if (p.x > width + 30) p.x = -30;
          if (p.y < -30) p.y = height + 30;
          else if (p.y > height + 30) p.y = -30;

          p.pulsePhase += 0.02;
          p.radius = p.baseRadius + Math.sin(p.pulsePhase) * 0.35;
        }
      }

      // Draw subtle connecting lines between nodes within threshold (< 120px)
      ctx.lineWidth = 1;
      for (let i = 0; i < particleCount; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < proximityThreshold) {
            // Line opacity 0.08 max fading out to proximity threshold
            const alpha = (1 - dist / proximityThreshold) * 0.09;
            const isBond = p1.bondPartner === j || p2.bondPartner === i;

            if (isBond) {
              // Covalent bond visual: slightly higher contrast
              ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 1.8})`;
              ctx.lineWidth = 1.2;
            } else {
              // Lattice connection: subtle cyan/emerald
              ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`;
              ctx.lineWidth = 0.8;
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes (hydrocarbon molecules / catalyst clusters)
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // Glow halo for catalyst & radical particles
        if (p.type === "catalyst" || p.type === "radical") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = p.type === "catalyst" ? "rgba(16, 185, 129, 0.08)" : "rgba(14, 165, 233, 0.07)";
          ctx.fill();
        }

        // Core atom node
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // High-tech center pip
        if (p.baseRadius > 2.2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.7, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.fill();
        }
      }

      if (!isReduced) {
        animId = requestAnimationFrame(render);
      }
    };

    if (checkReducedMotion()) {
      render(performance.now());
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseleave", onPointerLeave);
    };
  }, []);

  return (
    <div
      className="animated-background-container fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
      aria-hidden="true"
    >
      {/* Radial Ambient Glow Breathing Orbs */}
      {/* Orb A: Deep Emerald (#059669, 10% opacity) in the top-right */}
      <div
        className="ambient-orb ambient-orb-emerald absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(5, 150, 105, 0.14) 0%, rgba(5, 150, 105, 0.05) 50%, transparent 75%)",
          willChange: "transform",
        }}
      />

      {/* Orb B: Cyber Cyan / Indigo (#0ea5e9, 8% opacity) in the bottom-left */}
      <div
        className="ambient-orb ambient-orb-cyan absolute -bottom-28 -left-28 h-[500px] w-[500px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 75%)",
          willChange: "transform",
        }}
      />

      {/* Additional subtle center cyber grid vignette */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, transparent 30%, rgba(11, 15, 23, 0.4) 100%)",
        }}
      />

      {/* Interactive Chemical/Particle Lattice Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
      />
    </div>
  );
}
