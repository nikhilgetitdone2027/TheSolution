import { Cell, Pie, PieChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedCounter } from "./animations/AnimatedCounter";

const PALETTE = ["#1f4d38", "#2c455c", "#8a4b32", "#6b6238", "#6e3a3a", "#8a8478"];

export function CompositionDonut({
  rows,
  onSelect,
}: {
  rows: Array<{ name: string; value: number }>;
  onSelect?: (name: string) => void;
}) {
  const summary = rows.map((row) => `${row.name} ${row.value.toFixed(1)}%`).join(", ");
  return (
    <figure>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} stroke="#f7f4ee" onClick={(item) => onSelect?.(String(item.name))}>
              {rows.map((row, index) => (
                <Cell key={row.name} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Material composition. {summary}</figcaption>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
        {rows.map((row, index) => (
          <li key={row.name}>
            <button type="button" className="flex w-full items-center justify-between gap-2 py-1 text-left" onClick={() => onSelect?.(row.name)}>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[index % PALETTE.length] }} aria-hidden />
                <span className="text-zinc-200">{row.name}</span>
              </span>
              <span className="tabular font-mono text-emerald-400">
                <AnimatedCounter value={row.value} decimals={1} suffix="%" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function HorizontalBars({
  rows,
  unit,
  label,
}: {
  rows: Array<{ name: string; value: number }>;
  unit?: string;
  label: string;
}) {
  const summary = rows.map((row) => `${row.name} ${row.value.toFixed(2)}${unit ?? ""}`).join(", ");
  return (
    <figure>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 16, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip formatter={(value) => `${Number(value).toFixed(2)}${unit ?? ""}`} />
            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-sm text-muted">
        {label}. {summary}
      </figcaption>
    </figure>
  );
}

export function GroupedBars({
  rows,
}: {
  rows: Array<Record<string, string | number>>;
}) {
  const keys = rows[0] ? Object.keys(rows[0]).filter((key) => key !== "name") : [];
  const isComparison = keys.includes("Before") && keys.includes("After");

  if (isComparison) {
    return (
      <figure className="space-y-4">
        {/* Fluid Liquid-Fill Comparison Flow Bars with Continuous Shimmer */}
        <div className="space-y-3.5 rounded-lg bg-black/40 p-4 border border-white/[0.08] backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-white/[0.08] pb-2">
            <span className="uppercase tracking-wider">Dynamic Stream Comparison</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Baseline</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                <span>Simulated What-If</span>
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {rows.map((row) => {
              const beforeVal = Number(row.Before ?? 0);
              const afterVal = Number(row.After ?? 0);
              const shift = afterVal - beforeVal;

              return (
                <div key={String(row.name)} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-zinc-200 capitalize">
                      {String(row.name)} Stream
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 text-[11px]">
                        Base: <AnimatedCounter value={beforeVal} decimals={1} suffix="%" />
                      </span>
                      <span className="text-emerald-400 font-bold text-xs">
                        Sim: <AnimatedCounter value={afterVal} decimals={1} suffix="%" />
                      </span>
                    </div>
                  </div>

                  {/* Dual Liquid Fill Bars */}
                  <div className="space-y-1">
                    {/* Baseline bar */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="liquid-bar-fill block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, beforeVal))}%`,
                          backgroundColor: "#64748b",
                          opacity: 0.75,
                        }}
                      />
                    </div>
                    {/* Simulated What-if bar with continuous shimmer stripes and glow */}
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="liquid-bar-fill block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, afterVal))}%`,
                          backgroundColor: shift >= 0 ? "#10b981" : "#0ea5e9",
                          boxShadow: `0 0 10px ${shift >= 0 ? "#10b98188" : "#0ea5e988"}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <figcaption className="text-xs text-muted">
          Dynamic liquid flow response: Bars continuously animate with 60 FPS cubic-bezier spring flow and fluid light shimmer when controls change.
        </figcaption>
      </figure>
    );
  }

  return (
    <figure>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            {keys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={PALETTE[index % PALETTE.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-sm text-muted">Grouped comparison of model estimates.</figcaption>
    </figure>
  );
}
