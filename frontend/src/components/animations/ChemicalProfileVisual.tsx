import { finite } from "../../format";
import type { Sample } from "../../types";
import { MATERIAL_COLORS } from "./motion";

const POLYMERS = [
  { key: "pe_pct", name: "PE", unit: "(C₂H₄)ₙ", kind: "chain", note: "Saturated hydrocarbon chain" },
  { key: "pp_pct", name: "PP", unit: "(C₃H₆)ₙ", kind: "branch", note: "Hydrocarbon chain with methyl side groups" },
  { key: "pet_pct", name: "PET", unit: "(C₁₀H₈O₄)ₙ", kind: "ring", note: "Aromatic ester repeat unit" },
  { key: "ps_pct", name: "PS", unit: "(C₈H₈)ₙ", kind: "ring", note: "Aromatic side ring on the chain" },
  { key: "pvc_pct", name: "PVC", unit: "(C₂H₃Cl)ₙ", kind: "chlorine", note: "Chlorine-bearing repeat unit" },
] as const;

function Motif({ kind, color }: { kind: (typeof POLYMERS)[number]["kind"]; color: string }) {
  const beads = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 160 48" className="polymer-motif" aria-hidden>
      <path d="M8 24 L152 24" stroke={color} strokeWidth="2" className="polymer-backbone" />
      {beads.map((index) => (
        <g key={index} className="polymer-bead" style={{ animationDelay: `${index * 90}ms` }}>
          <circle cx={16 + index * 26} cy={24} r={5} fill={color} />
          {kind === "branch" && index % 2 === 0 ? <line x1={16 + index * 26} y1={24} x2={16 + index * 26} y2={8} stroke={color} strokeWidth="2" /> : null}
          {kind === "ring" && index % 3 === 1 ? (
            <polygon
              points={[0, 1, 2, 3, 4, 5]
                .map((corner) => {
                  const angle = (Math.PI / 3) * corner;
                  return `${16 + index * 26 + 8 * Math.cos(angle)},${38 + 8 * Math.sin(angle)}`;
                })
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth="1.6"
            />
          ) : null}
          {kind === "chlorine" && index % 2 === 1 ? (
            <>
              <line x1={16 + index * 26} y1={24} x2={16 + index * 26} y2={10} stroke={color} strokeWidth="2" />
              <text x={16 + index * 26} y={8} textAnchor="middle" fontSize="8" fill={color}>
                Cl
              </text>
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function ChemicalProfileVisual({ sample }: { sample: Sample }) {
  const present = POLYMERS.map((polymer) => ({ ...polymer, value: finite(sample.inputs[polymer.key]) })).filter(
    (polymer) => polymer.value !== null && polymer.value > 0,
  );
  const other = finite(sample.inputs.other_pct);
  return (
    <figure>
      <p className="mb-3 inline-block border border-line px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">
        Theoretical / categorical representation
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {present.map((polymer, index) => (
          <li key={polymer.key} className="lift border border-line bg-paper px-3 py-2 fade-up" style={{ animationDelay: `${index * 120}ms` }}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {polymer.name} <span className="font-mono text-xs text-muted">{polymer.unit}</span>
              </span>
              <span className="tabular">{polymer.value?.toFixed(1)}%</span>
            </div>
            <Motif kind={polymer.kind} color={MATERIAL_COLORS[polymer.key]} />
            <p className="text-xs text-muted">{polymer.note}</p>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-muted">
        Drawn from the polymer categories in the entered composition. No molecular structure was measured.
        {other && other > 0 ? ` Other (${other.toFixed(1)}%) has no assumed structure and is not drawn.` : ""}
      </figcaption>
    </figure>
  );
}
