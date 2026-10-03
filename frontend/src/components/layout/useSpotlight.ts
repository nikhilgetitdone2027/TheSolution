import { useCallback, useRef, useState, type MouseEvent } from "react";

export function useSpotlight<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Fast direct DOM property update for 60fps hardware acceleration
    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
    el.style.setProperty("--spotlight-opacity", "1");

    setCoords({ x, y });
  }, []);

  const onMouseEnter = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.style.setProperty("--spotlight-opacity", "1");
    }
    setIsHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.style.setProperty("--spotlight-opacity", "0");
    }
    setIsHovered(false);
  }, []);

  return {
    ref: containerRef,
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    coords,
    isHovered,
  };
}
