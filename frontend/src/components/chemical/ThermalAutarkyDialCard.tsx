import type { ScientificIntelligence } from "../../types";
import { SpotlightCard } from "../layout/SpotlightCard";
import { AnimatedCounter } from "../animations/AnimatedCounter";

interface ThermalAutarkyDialCardProps {
  thermodynamics?: ScientificIntelligence["thermodynamics"];
}

export function ThermalAutarkyDialCard({ thermodynamics }: ThermalAutarkyDialCardProps) {
  if (!thermodynamics) {
    return (
      <SpotlightCard className="p-5">
        <h2 className="font-serif text-2xl text-white">Thermodynamics & Thermal Autarky</h2>
        <p className="mt-2 text-sm text-zinc-400">Awaiting process conditions...</p>
      </SpotlightCard>
    );
  }

  const { autarky, feedstock_hhv, elemental_blend } = thermodynamics;
  const pct = Math.min(100, Math.max(0, autarky.thermal_autarky_pct));
  const isFullAutarky = autarky.self_sustained;

  // Circular gauge math (240 degree arc)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * pct) / 100;

  return (
    <SpotlightCard as="article" spotlightColor={isFullAutarky ? "emerald" : "amber"} className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Module 2 · Energy Balance & Autarky
          </p>
          <h2 className="font-serif text-2xl font-medium text-white">
            Thermodynamics & Syngas Thermal Autarky
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-medium ${
              isFullAutarky
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isFullAutarky ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-400"
              }`}
            />
            {isFullAutarky ? "100% THERMALLY AUTARKIC" : "PARTIAL AUTARKY"}
          </span>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-mono text-cyan-300 ring-1 ring-white/10">
            NER: {autarky.net_energy_ratio_ner}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[190px_1fr]">
        {/* Circular Dial Gauge */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-black/30 p-4 backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-white/10"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="transition-all duration-700 ease-out"
                stroke={isFullAutarky ? "#10b981" : "#f59e0b"}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: `drop-shadow(0 0 8px ${isFullAutarky ? "#10b98188" : "#f59e0b88"})`,
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center text-center">
              <span className="font-mono text-3xl font-bold tracking-tight text-white">
                <AnimatedCounter value={pct} decimals={0} suffix="%" />
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Autarky</span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs font-mono text-zinc-400">
            Ratio: {autarky.autarky_ratio.toFixed(2)}x
          </p>
        </div>

        {/* Energy breakdown & balances */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400">Feedstock HHV (Boie)</p>
              <p className="mt-1 font-mono text-xl font-semibold text-white">
                <AnimatedCounter value={feedstock_hhv.hhv_mj_kg} decimals={2} />{" "}
                <span className="text-xs font-normal text-zinc-400">MJ/kg</span>
              </p>
              <p className="mt-1 text-[10px] text-zinc-400 truncate">
                C: {elemental_blend.C}%, H: {elemental_blend.H}%, O: {elemental_blend.O}%
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400">Reactor Thermal Duty</p>
              <p className="mt-1 font-mono text-xl font-semibold text-white">
                <AnimatedCounter value={autarky.q_total_thermal_demand_mj} decimals={0} />{" "}
                <span className="text-xs font-normal text-zinc-400">MJ/ton</span>
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                Sensible + Cracking + 15% loss
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400">Syngas Energy (LHV)</p>
              <p className="mt-1 font-mono text-xl font-semibold text-emerald-400">
                <AnimatedCounter value={autarky.e_gas_recovered_mj} decimals={0} />{" "}
                <span className="text-xs font-normal text-zinc-400">MJ/ton</span>
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                {autarky.gas_mass_kg} kg gas @ 32 MJ/kg
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400">Net Energy Ratio (NER)</p>
              <p className="mt-1 font-mono text-xl font-semibold text-cyan-300">
                <AnimatedCounter value={autarky.net_energy_ratio_ner} decimals={2} />
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                (E_oil + E_gas) / Total Input
              </p>
            </div>
          </div>

          {/* Thermal Duty Progress Bar with Liquid Fill and Shimmer */}
          <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs backdrop-blur-sm">
            <div className="flex justify-between text-zinc-300 font-mono text-[11px]">
              <span>Syngas Energy Generated ({autarky.e_gas_recovered_mj} MJ)</span>
              <span>Reactor Heat Demand ({autarky.q_total_thermal_demand_mj} MJ)</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="liquid-bar-fill block h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    (autarky.e_gas_recovered_mj / autarky.q_total_thermal_demand_mj) * 100
                  )}%`,
                  backgroundColor: isFullAutarky ? "#10b981" : "#f59e0b",
                  boxShadow: `0 0 10px ${isFullAutarky ? "#10b98188" : "#f59e0b88"}`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              {autarky.assessment}
            </p>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
