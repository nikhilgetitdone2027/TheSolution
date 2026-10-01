import { useWorkflow } from "../../workflow/engine";

const NODES = [
  { id: "user", label: "User", note: "Browser" },
  { id: "sample", label: "Sample", note: "Entered or CSV" },
  { id: "backend", label: "Backend", note: "Express API" },
  { id: "validation", label: "Validation", note: "Schema + checks" },
  { id: "fastapi", label: "FastAPI", note: "ML service" },
  { id: "model", label: "ML model", note: "scikit-learn" },
  { id: "optimizer", label: "Optimizer", note: "Grid in range" },
  { id: "result", label: "Result", note: "Saved sample" },
  { id: "saathi", label: "Saathi", note: "Grounded answer" },
  { id: "back", label: "User", note: "Sees the decision" },
] as const;

type NodeId = (typeof NODES)[number]["id"];

function activeNodes(focus: string | null, running: boolean): NodeId[] {
  if (!running) return [];
  if (focus === "sample" || focus === "composition") return ["sample", "backend"];
  if (focus === "validation") return ["backend", "validation", "fastapi"];
  if (focus === "ml" || focus === "prediction" || focus === "flow" || focus === "explanation") return ["fastapi", "model"];
  if (focus === "optimization" || focus === "best") return ["model", "optimizer"];
  if (focus === "complete") return ["result", "saathi"];
  return ["backend"];
}

export function SystemArchitectureAnimation() {
  const state = useWorkflow();
  const live = activeNodes(state.focus, state.status === "running");
  return (
    <figure>
      <ol className="system-flow" aria-label="System data flow">
        {NODES.map((node, index) => (
          <li key={`${node.id}-${index}`} className={`system-node ${live.includes(node.id) ? "is-live" : ""}`}>
            <span className="system-card">
              <span className="block text-sm font-medium">{node.label}</span>
              <span className="block text-xs text-muted">{node.note}</span>
            </span>
            {index < NODES.length - 1 ? (
              <span className="system-link" aria-hidden>
                <span className="system-packet" style={{ animationDelay: `${index * 0.35}s` }} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 text-xs text-muted">
        {state.status === "running" ? "Highlighted nodes are handling the current analysis stage." : "Packets show the request path. Run an analysis to see the active stage highlighted."} No credentials or keys are shown.
      </figcaption>
    </figure>
  );
}
