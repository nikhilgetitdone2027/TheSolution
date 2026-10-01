import { useEffect, useState } from "react";
import type { AvatarState } from "./SaathiState";

export function SaathiAvatar({ state, mouth, size = "full" }: { state: AvatarState; mouth: number; size?: "full" | "small" }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 180);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`saathi-frame is-${state} ${size === "small" ? "is-small" : ""}`}>
      <span className="saathi-ring" aria-hidden />
      <div className={`saathi-face is-${state} ${blink ? "is-blink" : ""}`} style={{ ["--mouth" as string]: state === "speaking" ? mouth : 0.15 }}>
        <img src="/saathi.jpg" alt="Saathi" />
        <span className="saathi-lid left" />
        <span className="saathi-lid right" />
        <span className="saathi-mouth" />
      </div>
      {state === "listening" ? (
        <span className="saathi-mic" aria-hidden>
          🎙
        </span>
      ) : null}
      {state === "thinking" ? (
        <span className="saathi-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      ) : null}
    </div>
  );
}
