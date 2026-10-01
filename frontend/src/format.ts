export function finite(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function formatNumber(value: unknown, digits = 1): string | null {
  const number = finite(value);
  if (number === null) return null;
  return number.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function showNumber(value: unknown, digits = 1, suffix = ""): string {
  const text = formatNumber(value, digits);
  return text === null ? "Insufficient data" : `${text}${suffix}`;
}

export const MATERIAL_FIELDS = [
  ["pe_pct", "PE"],
  ["pp_pct", "PP"],
  ["pet_pct", "PET"],
  ["ps_pct", "PS"],
  ["pvc_pct", "PVC"],
  ["other_pct", "Other"],
] as const;

export const PROCESS_FIELDS = [
  ["moisture_pct", "Moisture", "%"],
  ["particle_size_mm", "Particle size", "mm"],
  ["feed_rate_kg_h", "Feed rate", "kg/h"],
  ["temperature_c", "Temperature", "°C"],
  ["residence_time_min", "Residence time", "min"],
] as const;

export const CATEGORIES = [
  ["mixed_plastic", "Mixed plastic"],
  ["organic", "Organic"],
  ["msw", "Municipal solid waste"],
  ["industrial", "Industrial waste"],
] as const;
