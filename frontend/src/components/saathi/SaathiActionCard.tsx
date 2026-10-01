export type Activity = { label: string; tools: string[]; state: "running" | "done" | "error" };

export function SaathiActionCard({ activity }: { activity: Activity | null }) {
  if (!activity) return null;
  return (
    <div className={`action-card is-${activity.state}`} role="status">
      <span className="action-dot" aria-hidden />
      <span className="min-w-0">
        <span className="block text-xs font-medium">
          {activity.state === "done" ? "✓ " : activity.state === "error" ? "✕ " : ""}
          {activity.label}
        </span>
        {activity.tools.length ? <span className="block truncate font-mono text-[10px] text-muted">{activity.tools.join(" · ")}</span> : null}
      </span>
    </div>
  );
}
