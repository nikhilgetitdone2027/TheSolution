import type { ReactNode } from "react";
import { Saathi3DAvatar } from "./Saathi3DAvatar";
import type { AvatarState } from "../avatar/AvatarController";

interface SaathiDrawerProps {
  open: boolean;
  onClose: () => void;
  state: AvatarState;
  mouth?: number;
  title?: string;
  statusText?: string;
  children?: ReactNode;
}

export function SaathiDrawer({
  open,
  onClose,
  state,
  mouth = 0,
  title = "Saathi",
  statusText,
  children,
}: SaathiDrawerProps) {
  if (!open) return null;

  return (
    <section className="saathi-panel" aria-label="Saathi 3D Assistant" data-guided-ui>
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">CHEM2ENERGY AI</p>
          <h2 className="font-serif text-2xl">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`saathi-live ${state === "error" ? "is-error" : ""}`}>
            {state === "error" ? "Retry" : "3D Live"}
          </span>
          <button type="button" onClick={onClose} aria-label="Close Saathi">
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
        {/* Real-time 3D Interactive Human Avatar Canvas */}
        <Saathi3DAvatar state={state} mouth={mouth} size="full" />

        {statusText && (
          <p className="text-center text-sm text-muted" aria-live="polite">
            {statusText}
          </p>
        )}

        {children}
      </div>
    </section>
  );
}
