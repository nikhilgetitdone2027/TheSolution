import { useEffect, useRef, useState } from "react";

export function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useCountUp(target: number | null | undefined, { duration = 900, delay = 0, play = true } = {}): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    if (target === null || target === undefined || !Number.isFinite(target)) {
      setValue(0);
      return;
    }
    if (!play) {
      setValue(0);
      return;
    }
    if (reduced) {
      setValue(target);
      return;
    }
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame.current);
    };
  }, [target, duration, delay, play, reduced]);
  return value;
}

export function useStagger(count: number, interval: number, play = true): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!play) {
      setShown(0);
      return;
    }
    if (reduced) {
      setShown(count);
      return;
    }
    setShown(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setShown(current);
      if (current >= count) window.clearInterval(timer);
    }, interval);
    return () => window.clearInterval(timer);
  }, [count, interval, play, reduced]);
  return shown;
}

export const OUTPUT_COLORS: Record<string, string> = {
  oil_pct: "#1f4d38",
  gas_pct: "#2c455c",
  char_pct: "#6b5644",
  other_product_pct: "#8a8478",
};

export const MATERIAL_COLORS: Record<string, string> = {
  pe_pct: "#1f4d38",
  pp_pct: "#2f6a4e",
  pet_pct: "#2c455c",
  ps_pct: "#8a4b32",
  pvc_pct: "#6e3a3a",
  other_pct: "#8a8478",
};

export const FEATURE_LABELS: Record<string, string> = {
  pe_pct: "PE",
  pp_pct: "PP",
  pet_pct: "PET",
  ps_pct: "PS",
  pvc_pct: "PVC",
  other_pct: "Other",
  moisture_pct: "Moisture",
  particle_size_mm: "Size",
  feed_rate_kg_h: "Feed",
  temperature_c: "Temp",
  residence_time_min: "Time",
};
