export const AVATAR_STATES = ["idle", "listening", "thinking", "speaking", "error"] as const;
export type AvatarState = (typeof AVATAR_STATES)[number];
