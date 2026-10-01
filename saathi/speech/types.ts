/** Replaceable speech contracts. The browser adapters live in the web app. */

export type SpeechToTextProvider = {
  supported: boolean;
  start: (language: "en" | "hi" | "hinglish", onText: (text: string) => void, onEnd: () => void) => void;
  stop: () => void;
};

export type TextToSpeechProvider = {
  supported: boolean;
  speak: (
    text: string,
    language: "en" | "hi" | "hinglish",
    hooks: { onStart: () => void; onBoundary: (openness: number) => void; onEnd: () => void },
  ) => void;
  cancel: () => void;
};

export type AvatarProvider = {
  setState: (state: "idle" | "listening" | "thinking" | "speaking" | "error") => void;
  setMouth: (openness: number) => void;
};
