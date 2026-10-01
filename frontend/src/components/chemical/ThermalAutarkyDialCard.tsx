import type { ScientificIntelligence } from "../../types";

interface ThermalAutarkyDialCardProps {
  thermodynamics?: ScientificIntelligence["thermodynamics"];
}

export function ThermalAutarkyDialCard({ thermodynamics }: ThermalAutarkyDialCardProps) {
  if (!thermodynamics) {
    return (
      <div className="border border-line bg-surface p-4">
        <h2 className="font-serif text-2xl">Thermodynamics & Thermal Autarky</h2>
        <p className="mt-2 text-sm text-muted">Awaiting process conditions...</p>
      </div>
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
    <article className="border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Module 2 · Energy Balance & Autarky</p>
          <h2 className="font-serif text-2xl font-medium">Thermodynamics & Syngas Thermal Autarky</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium ${
              isFullAutarky
                ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30"
                : "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/30"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isFullAutarky ? "bg-emerald-600" : "bg-amber-500"}`} />
            {isFullAutarky ? "100% THERMALLY AUTARKIC" : "PARTIAL AUTARKY"}
          </span>
          <span className="rounded-full bg-pine/10 px-2.5 py-1 text-xs font-mono text-pine ring-1 ring-pine/20">
            NER: {autarky.net_energy_ratio_ner}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[180px_1fr]">
        {/* Circular Dial Gauge */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-panel/40 p-4">
          <div className="relative flex items-center justify-center">
            <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-line"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="transition-all duration-1000 ease-out"
                stroke={isFullAutarky ? "#059669" : "#d97706"}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center text-center">
              <span className="font-mono text-3xl font-bold tracking-tight text-ink">
                {pct}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted">Autarky</span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Ratio: {autarky.autarky_ratio.toFixed(2)}x
          </p>
        </div>

        {/* Energy breakdown & balances */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border border-line bg-panel/30 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted">Feedstock HHV (Boie)</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">
                {feedstock_hhv.hhv_mj_kg} <span className="text-xs font-normal text-muted">MJ/kg</span>
              </p>
              <p className="mt-1 text-[10px] text-muted truncate">
                C: {elemental_blend.C}%, H: {elemental_blend.H}%, O: {elemental_blend.O}%
              </p>
            </div>

            <div className="rounded-lg border border-line bg-panel/30 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted">Reactor Thermal Duty</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">
                {autarky.q_total_thermal_demand_mj} <span className="text-xs font-normal text-muted">MJ / ton</span>
              </p>
              <p className="mt-1 text-[10px] text-muted">
                Sensible + Cracking + 15% loss
              </p>
            </div>

            <div className="rounded-lg border border-line bg-panel/30 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted">Syngas Energy (LHV)</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">
                {autarky.e_gas_recovered_mj} <span className="text-xs font-normal text-muted">MJ / ton</span>
              </p>
              <p className="mt-1 text-[10px] text-muted">
                {autarky.gas_mass_kg} kg gas @ 32 MJ/kg
              </p>
            </div>

            <div className="rounded-lg border border-line bg-panel/30 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted">Net Energy Ratio (NER)</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">
                {autarky.net_energy_ratio_ner}
              </p>
              <p className="mt-1 text-[10px] text-muted">
                (E_oil + E_gas) / Total Input
              </p>
            </div>
          </div>

          {/* Thermal Duty Progress Bar */}
          <div className="space-y-1 rounded-lg border border-line bg-panel/30 p-3 text-xs">
            <div className="flex justify-between text-muted">
              <span>Syngas Energy Generated ({autarky.e_gas_recovered_mj} MJ)</span>
              <span>Reactor Heat Demand ({autarky.q_total_thermal_demand_mj} MJ)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line/80">
              <div
                className={`h-full transition-all duration-500 ${
                  isFullAutarky ? "bg-emerald-600" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, (autarky.e_gas_recovered_mj / autarky.q_total_thermal_demand_mj) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              {autarky.assessment}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
