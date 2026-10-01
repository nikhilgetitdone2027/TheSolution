import { Cell, Pie, PieChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
                <span className="inline-block h-2.5 w-2.5" style={{ background: PALETTE[index % PALETTE.length] }} aria-hidden />
                {row.name}
              </span>
              <span className="tabular">{row.value.toFixed(1)}%</span>
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
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#1c1915", fontSize: 12 }} />
            <Tooltip formatter={(value) => `${Number(value).toFixed(2)}${unit ?? ""}`} />
            <Bar dataKey="value" fill="#1f4d38" barSize={14} />
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
  return (
    <figure>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <XAxis dataKey="name" tick={{ fill: "#1c1915", fontSize: 12 }} />
            <YAxis tick={{ fill: "#5c564c", fontSize: 12 }} />
            <Tooltip />
            {keys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-sm text-muted">Grouped comparison of model estimates.</figcaption>
    </figure>
  );
}
