export type SpeechLanguage = "en" | "hi" | "hinglish";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const CODES: Record<SpeechLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  hinglish: "hi-IN",
};

function recognitionCtor(): (new () => Recognition) | null {
  const host = window as Window & { webkitSpeechRecognition?: new () => Recognition; SpeechRecognition?: new () => Recognition };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function speechToTextSupported(): boolean {
  return recognitionCtor() !== null;
}

export function textToSpeechSupported(): boolean {
  return "speechSynthesis" in window;
}

export function voiceAvailable(): boolean {
  return speechToTextSupported() || textToSpeechSupported();
}

export function startListening(language: SpeechLanguage, onText: (text: string) => void, onEnd: () => void): { stop: () => void } | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = CODES[language];
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) onText(transcript);
  };
  recognition.onerror = () => onEnd();
  recognition.onend = () => onEnd();
  recognition.start();
  return { stop: () => recognition.stop() };
}

export function speakText(
  text: string,
  language: SpeechLanguage,
  hooks: { onStart: () => void; onBoundary: (openness: number) => void; onEnd: () => void },
  interrupt = true,
): void {
  if (!textToSpeechSupported()) {
    hooks.onEnd();
    return;
  }
  if (interrupt) window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = CODES[language];
  utterance.rate = language === "en" ? 1 : 0.96;
  utterance.onstart = () => hooks.onStart();
  utterance.onboundary = (event) => {
    if (event.name !== "word") return;
    const word = text.slice(event.charIndex, event.charIndex + 8);
    hooks.onBoundary(Math.min(1, 0.25 + (word.trim().length % 4) * 0.2));
  };
  utterance.onend = () => hooks.onEnd();
  utterance.onerror = () => hooks.onEnd();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (textToSpeechSupported()) window.speechSynthesis.cancel();
}
