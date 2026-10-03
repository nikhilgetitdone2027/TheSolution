import { useSpringCounter } from "./motion";

interface AnimatedCounterProps {
  value: number | null | undefined;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  immediate?: boolean;
}

export function AnimatedCounter({
  value,
  decimals = 1,
  prefix = "",
  suffix = "",
  className = "",
  immediate = false,
}: AnimatedCounterProps) {
  const animated = useSpringCounter(value, {
    precision: decimals,
    immediate,
    stiffness: 140,
    damping: 18,
  });

  if (value === null || value === undefined) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={`tabular font-medium inline-block tabular-nums ${className}`}>
      {prefix}
      {animated.toFixed(decimals)}
      {suffix}
    </span>
  );
}
