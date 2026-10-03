import { type HTMLAttributes, type ReactNode } from "react";
import { useSpotlight } from "./useSpotlight";

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "figure";
  spotlightColor?: "emerald" | "cyan" | "amber";
  neonBorder?: boolean;
}

export function SpotlightCard({
  children,
  className = "",
  as: Component = "div",
  spotlightColor = "emerald",
  neonBorder = true,
  ...props
}: SpotlightCardProps) {
  const { ref, onMouseMove, onMouseEnter, onMouseLeave } = useSpotlight<HTMLDivElement>();

  // Glow color configurations
  const glowRgba =
    spotlightColor === "cyan"
      ? "rgba(14, 165, 233, 0.09)"
      : spotlightColor === "amber"
      ? "rgba(245, 158, 11, 0.08)"
      : "rgba(16, 185, 129, 0.09)"; // default emerald

  const borderFlareRgba =
    spotlightColor === "cyan"
      ? "rgba(14, 165, 233, 0.45), rgba(99, 102, 241, 0.25) 30%, transparent 60%"
      : spotlightColor === "amber"
      ? "rgba(245, 158, 11, 0.45), rgba(234, 88, 12, 0.25) 30%, transparent 60%"
      : "rgba(16, 185, 129, 0.45), rgba(14, 165, 233, 0.25) 30%, transparent 60%";

  return (
    <Component
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative overflow-hidden rounded-xl backdrop-blur-xl bg-[#0b0f17]/80 border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-300 hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.45)] ${className}`}
      style={{
        transform: "translate3d(0,0,0)",
        willChange: "transform",
      }}
      {...props}
    >
      {/* Dynamic Radial Spotlight Background Fill */}
      <div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${glowRgba}, transparent 40%)`,
        }}
        aria-hidden="true"
      />

      {/* Dynamic Neon Edge Flare */}
      {neonBorder && (
        <div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(320px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${borderFlareRgba})`,
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
          aria-hidden="true"
        />
      )}

      {/* Content Container */}
      <div className="relative z-10">{children}</div>
    </Component>
  );
}
