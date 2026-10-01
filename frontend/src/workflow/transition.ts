import { flushSync } from "react-dom";
import type { NavigateFunction } from "react-router-dom";

export function transitionTo(navigate: NavigateFunction, path: string): void {
  const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.location.pathname === path) return;
  if (doc.startViewTransition && !reduced) {
    doc.startViewTransition(() => {
      flushSync(() => navigate(path));
    });
    return;
  }
  navigate(path);
}
