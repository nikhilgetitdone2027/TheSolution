import type { Prediction } from "../../types";
import { OUTPUT_COLORS, useReducedMotion } from "./motion";
import { AnimatedCounter } from "./AnimatedCounter";

export function ProductFlow({ prediction }: { prediction: Prediction }) {
  const reduced = useReducedMotion();
  const outputs = prediction.outputs ?? [];
  const height = 230;
  const total = outputs.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 40;

  const lanes = outputs.map((item, index) => {
    const width = Math.max(3, (item.value / total) * 120);
    const startY = cursor + width / 2;
    cursor += width;
    const endY = 28 + index * ((height - 56) / Math.max(1, outputs.length - 1));
    return { ...item, width, startY, endY, index };
  });

  return (
    <figure className="space-y-4">
      <div className="overflow-x-auto rounded-lg bg-black/30 p-2 border border-white/[0.06]">
        <svg
          viewBox={`0 0 540 ${height}`}
          className="product-flow min-w-[460px] w-full"
          role="img"
          aria-label={`Model-estimated product distribution: ${outputs
            .map((item) => `${item.label} ${item.value.toFixed(1)} percent`)
            .join(", ")}`}
        >
          <defs>
            {lanes.map((lane) => {
              const color = OUTPUT_COLORS[lane.key] ?? "#10b981";
              return (
                <linearGradient
                  key={`lane-grad-${lane.key}`}
                  id={`lane-grad-${lane.key}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                  <stop offset="40%" stopColor={color} stopOpacity="0.75" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.9" />
                </linearGradient>
              );
            })}
            <filter id="flow-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Source node */}
          <rect
            x="14"
            y="40"
            width="72"
            height="120"
            rx="8"
            className="flow-source fill-[#0f172a] stroke-emerald-500/40"
            strokeWidth="1.5"
          />
          <text
            x="50"
            y="98"
            textAnchor="middle"
            className="flow-source-text fill-emerald-300 font-mono text-xs font-semibold"
          >
            Feedstock
          </text>
          <text
            x="50"
            y="114"
            textAnchor="middle"
            className="fill-zinc-400 font-mono text-[10px]"
          >
            Waste Blend
          </text>

          {lanes.map((lane) => {
            const path = `M86 ${lane.startY} C 220 ${lane.startY}, 270 ${lane.endY}, 380 ${lane.endY}`;
            const color = OUTPUT_COLORS[lane.key] ?? "#10b981";
            const particles = Math.max(1, Math.round(lane.value / 12));

            return (
              <g key={lane.key}>
                {/* Flow lane ribbon with fluid styling */}
                <path
                  d={path}
                  stroke={`url(#lane-grad-${lane.key})`}
                  strokeWidth={lane.width}
                  fill="none"
                  className="flow-lane transition-all duration-500"
                  style={{
                    filter: "url(#flow-glow)",
                    strokeLinecap: "round",
                    opacity: 0.85,
                  }}
                />

                {/* Animated Brownian & Flow Particles along stream */}
                {!reduced
                  ? Array.from({ length: particles }, (_, particle) => (
                      <circle
                        key={particle}
                        r="2.5"
                        fill="#ffffff"
                        className="flow-particle shadow-sm"
                        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                      >
                        <animateMotion
                          dur={`${2.2 + (lane.index % 3) * 0.4}s`}
                          repeatCount="indefinite"
                          begin={`${(particle / particles) * 2.2}s`}
                          path={path}
                        />
                      </circle>
                    ))
                  : null}

                {/* Target Node Pill */}
                <rect
                  x="385"
                  y={lane.endY - 12}
                  width="140"
                  height="24"
                  rx="6"
                  className="fill-[#0b0f17]/90 stroke-white/10"
                  strokeWidth="1"
                />
                <circle
                  cx="396"
                  cy={lane.endY}
                  r="4"
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                />
                <text
                  x="408"
                  y={lane.endY + 3.5}
                  className="fill-zinc-200 font-medium text-xs"
                >
                  {lane.label}
                </text>
                <text
                  x="512"
                  y={lane.endY + 3.5}
                  textAnchor="end"
                  className="fill-emerald-400 font-mono text-xs font-semibold"
                >
                  {lane.value.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Liquid Flow Stacked Bar with Continuous Shimmer Effect */}
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
          <span className="uppercase tracking-wider">Dynamic Yield Distribution</span>
          <span>Surrogate Split: 100%</span>
        </div>

        {/* Liquid progress flow bars with continuous shimmer stripes */}
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 gap-0.5">
          {outputs.map((item) => {
            const color = OUTPUT_COLORS[item.key] ?? "#10b981";
            return (
              <div
                key={item.key}
                className="liquid-bar-fill h-full rounded-full"
                style={{
                  width: `${item.value}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}88`,
                }}
                title={`${item.label}: ${item.value.toFixed(1)}%`}
              />
            );
          })}
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          {outputs.map((item) => {
            const color = OUTPUT_COLORS[item.key] ?? "#10b981";
            return (
              <li key={item.key} className="flex items-center justify-between gap-1.5 rounded bg-white/[0.03] px-2 py-1 border border-white/[0.05]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-zinc-300 font-medium">{item.label}</span>
                </span>
                <span className="font-mono text-emerald-400">
                  <AnimatedCounter value={item.value} decimals={1} suffix="%" />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <figcaption className="text-xs text-muted">
        Model-estimated product distribution. Lane widths and liquid fills dynamically adapt with 60 FPS spring interpolation to input composition changes.
      </figcaption>
    </figure>
  );
}
