import { useEffect, useRef, useState } from "react";

export function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Spring Counter interpolation for yields, temperature and metrics.
 * Provides smooth spring interpolation when sliders/parameters move
 * rather than hard jumps.
 */
export function useSpringCounter(
  target: number | null | undefined,
  {
    stiffness = 140,
    damping = 18,
    precision = 1,
    immediate = false,
  }: {
    stiffness?: number;
    damping?: number;
    precision?: number;
    immediate?: boolean;
  } = {}
): number {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(() => target ?? 0);
  const currentRef = useRef(current);
  currentRef.current = current;
  const velocityRef = useRef(0);
  const targetRef = useRef(target ?? 0);
  targetRef.current = target ?? 0;
  const animFrame = useRef(0);

  useEffect(() => {
    if (target === null || target === undefined || !Number.isFinite(target)) {
      return;
    }

    if (reduced || immediate) {
      setCurrent(target);
      velocityRef.current = 0;
      return;
    }

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const delta = targetRef.current - currentRef.current;
      const springForce = delta * stiffness;
      const dampingForce = -velocityRef.current * damping;
      const acceleration = springForce + dampingForce;

      velocityRef.current += acceleration * dt;
      const nextValue = currentRef.current + velocityRef.current * dt;

      const threshold = Math.pow(10, -(precision + 1));
      if (Math.abs(delta) < threshold && Math.abs(velocityRef.current) < 0.02) {
        setCurrent(targetRef.current);
        velocityRef.current = 0;
        return;
      }

      setCurrent(nextValue);
      animFrame.current = requestAnimationFrame(tick);
    };

    animFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame.current);
  }, [target, stiffness, damping, precision, reduced, immediate]);

  return current;
}

export function useCountUp(
  target: number | null | undefined,
  { duration = 800, delay = 0, play = true } = {}
): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const prevTargetRef = useRef(0);
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
      prevTargetRef.current = target;
      return;
    }

    const startVal = prevTargetRef.current;
    const diff = target - startVal;
    let start = 0;

    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const progress = Math.min(1, (now - start) / duration);
        // Smooth cubic out
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentVal = startVal + diff * eased;
        setValue(currentVal);

        if (progress < 1) {
          frame.current = requestAnimationFrame(tick);
        } else {
          prevTargetRef.current = target;
        }
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
  oil_pct: "#059669",
  gas_pct: "#0ea5e9",
  char_pct: "#d97706",
  other_product_pct: "#64748b",
};

export const MATERIAL_COLORS: Record<string, string> = {
  pe_pct: "#059669",
  pp_pct: "#10b981",
  pet_pct: "#0ea5e9",
  ps_pct: "#f59e0b",
  pvc_pct: "#ef4444",
  other_pct: "#64748b",
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
