import { Saathi3DAvatar } from "../../saathi/components/Saathi3DAvatar";
import type { AvatarState } from "./SaathiState";

export function SaathiAvatar({
  state,
  mouth,
  size = "full",
}: {
  state: AvatarState;
  mouth: number;
  size?: "full" | "small";
}) {
  return <Saathi3DAvatar state={state} mouth={mouth} size={size} />;
}
