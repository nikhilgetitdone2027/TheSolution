import type { AnalysisWorkflowState } from "../../workflow/engine";

export type LocalState = "idle" | "listening" | "thinking" | "speaking" | "error";
export type AvatarState = LocalState | "validating" | "analyzing" | "success";

export function deriveAvatarState(local: LocalState, workflow: AnalysisWorkflowState, now: number): AvatarState {
  if (local !== "idle") return local;
  if (workflow.status === "running") {
    if (workflow.focus === "sample" || workflow.focus === "composition" || workflow.focus === "validation") return "validating";
    return "analyzing";
  }
  const recent = workflow.completedAt !== undefined && now - workflow.completedAt < 4000;
  if (recent && workflow.status === "error") return "error";
  if (recent && workflow.status === "success") return "success";
  return "idle";
}

export function avatarStatusText(state: AvatarState): string {
  switch (state) {
    case "listening":
      return "I'm listening…";
    case "thinking":
      return "I'm analyzing the current data…";
    case "speaking":
      return "Saathi is speaking…";
    case "validating":
      return "Checking the sample…";
    case "analyzing":
      return "Following the model run…";
    case "success":
      return "✓ Analysis complete.";
    case "error":
      return "I couldn't complete that request. You can try again or use text.";
    default:
      return "Ask Saathi anything about this analysis.";
  }
}
