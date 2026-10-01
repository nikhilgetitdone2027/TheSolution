import { useState } from "react";
import { formatNumber } from "../format";

interface CommercialFeasibilityCardProps {
  oilPct?: number;
  gasPct?: number;
  charPct?: number;
  className?: string;
}

export function CommercialFeasibilityCard({
  oilPct = 68.5,
  gasPct = 21.0,
  charPct = 9.5,
  className = "",
}: CommercialFeasibilityCardProps) {
  // Configurable parameters with industry standards
  const [feedstockKgPerDay, setFeedstockKgPerDay] = useState(1000); // 1 Ton/day baseline
  const [crudePricePerLiter, setCrudePricePerLiter] = useState(0.75); // $0.65 - $0.85 / L

  // 1. Oil Yield Conversion (Density ≈ 0.85 kg/L)
  const oilDensityKgPerL = 0.85;
  const dailyOilKg = feedstockKgPerDay * (oilPct / 100);
  const dailyOilLiters = dailyOilKg / oilDensityKgPerL;
  const dailyOilRevenue = dailyOilLiters * crudePricePerLiter;
  const dailyCharKg = feedstockKgPerDay * (charPct / 100);

  // 2. Syngas Energy Credit (LHV ≈ 30 MJ/kg)
  const syngasLhvMjPerKg = 30.0;
  const dailyGasKg = feedstockKgPerDay * (gasPct / 100);
  const dailyEnergyGeneratedMj = dailyGasKg * syngasLhvMjPerKg;
  // Pyrolysis reactor thermal duty ~ 1.5 MJ/kg feedstock
  const reactorThermalDutyMj = feedstockKgPerDay * 1.5;
  const selfHeatingOffsetPct = Math.min(100, (dailyEnergyGeneratedMj / reactorThermalDutyMj) * 100);
  // Heating fuel replacement credit (~ $0.012 per MJ)
  const dailyEnergyCredit = dailyEnergyGeneratedMj * 0.012;

  // 3. Totals
  const totalDailyValue = dailyOilRevenue + dailyEnergyCredit;
  const annualOperatingDays = 330;
  const annualProjectedRevenue = totalDailyValue * annualOperatingDays;

  return (
    <article className={`border border-line bg-surface p-5 shadow-card ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted">
            Techno-Economic Feasibility
          </span>
          <h2 className="font-serif text-2xl font-medium text-ink">Commercial Feasibility Estimator</h2>
          <p className="mt-0.5 text-xs text-muted">
            Derived directly from surrogate ML predicted product distribution
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Feedstock scale pills */}
          {[1000, 5000, 20000].map((tpd) => (
            <button
              key={tpd}
              type="button"
              onClick={() => setFeedstockKgPerDay(tpd)}
              className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${
                feedstockKgPerDay === tpd
                  ? "bg-pine text-white font-medium"
                  : "border border-line bg-paper text-muted hover:text-ink"
              }`}
            >
              {tpd / 1000} T/day
            </button>
          ))}
        </div>
      </header>

      {/* Main KPI Grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Daily Pyrolysis Oil */}
        <div className="rounded-lg border border-line bg-paper/60 p-3.5">
          <p className="text-[11px] uppercase tracking-wider text-muted">Pyrolysis Oil Yield</p>
          <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">
            {formatNumber(dailyOilLiters, 0)} <span className="text-sm font-normal text-muted">L/day</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatNumber(dailyOilKg, 0)} kg ({oilPct.toFixed(1)}% yield @ 0.85 kg/L)
          </p>
        </div>

        {/* Metric 2: Estimated Daily Fuel Value */}
        <div className="rounded-lg border border-line bg-paper/60 p-3.5">
          <p className="text-[11px] uppercase tracking-wider text-muted">Daily Liquid Fuel Value</p>
          <p className="mt-1 text-2xl font-bold font-mono text-ink">
            ${formatNumber(dailyOilRevenue, 2)} <span className="text-sm font-normal text-muted">/day</span>
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-muted">
            <span>Benchmark: ${crudePricePerLiter.toFixed(2)}/L</span>
            <input
              type="range"
              min="0.65"
              max="0.85"
              step="0.01"
              value={crudePricePerLiter}
              onChange={(e) => setCrudePricePerLiter(Number(e.target.value))}
              className="ml-2 w-16"
              title="Adjust crude / diesel replacement value ($0.65 - $0.85)"
            />
          </div>
        </div>

        {/* Metric 3: Syngas Thermal Offset */}
        <div className="rounded-lg border border-line bg-paper/60 p-3.5">
          <p className="text-[11px] uppercase tracking-wider text-muted">Syngas Self-Heating</p>
          <p className="mt-1 text-2xl font-bold font-mono text-amber-600">
            {selfHeatingOffsetPct.toFixed(0)}% <span className="text-sm font-normal text-muted">offset</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatNumber(dailyEnergyGeneratedMj, 0)} MJ generated (LHV 30 MJ/kg)
          </p>
        </div>

        {/* Metric 4: Annual Refinery Projection */}
        <div className="rounded-lg border border-line bg-paper/60 p-3.5 bg-gradient-to-br from-paper/40 to-emerald-500/10">
          <p className="text-[11px] uppercase tracking-wider text-muted">Annual Commercial Value</p>
          <p className="mt-1 text-2xl font-bold font-mono text-emerald-700">
            ${formatNumber(annualProjectedRevenue, 0)} <span className="text-sm font-normal text-muted">/yr</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {annualOperatingDays} operating days/yr (net fuel + thermal credit)
          </p>
        </div>
      </div>

      {/* Energy Balance Bar */}
      <div className="mt-4 rounded-lg border border-line/60 bg-paper/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-muted">
            Reactor Thermal Self-Sufficiency: {dailyEnergyGeneratedMj.toFixed(0)} MJ syngas vs {reactorThermalDutyMj.toFixed(0)} MJ duty
          </span>
          <span className="font-mono font-semibold text-pine">
            +${formatNumber(dailyEnergyCredit, 2)}/day heating credit
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line/60">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, selfHeatingOffsetPct)}%` }}
          />
        </div>
      </div>

      {/* Mandatory Provenance & Disclaimers */}
      <footer className="mt-4 border-t border-line/60 pt-2 text-xs text-muted flex flex-wrap items-center justify-between gap-2">
        <p>
          <em>* Model-Derived Commercial Estimate — Non-binding refinery projection</em>
        </p>
        <p className="font-mono text-[11px]">
          Basis: {feedstockKgPerDay / 1000} TPD feedstock · Density 0.85 kg/L · LHV 30 MJ/kg · Fuel benchmark ${crudePricePerLiter.toFixed(2)}/L · Solid Char: {formatNumber(dailyCharKg, 0)} kg/day
        </p>
      </footer>
    </article>
  );
}
