import { useRef, useState, useCallback } from "react";
import * as THREE from "three";

export interface VisemeWeights {
  viseme_aa: number;
  viseme_E: number;
  viseme_I: number;
  viseme_O: number;
  viseme_U: number;
  viseme_PP: number;
  viseme_SS: number;
}

const DEFAULT_VISEMES: VisemeWeights = {
  viseme_aa: 0,
  viseme_E: 0,
  viseme_I: 0,
  viseme_O: 0,
  viseme_U: 0,
  viseme_PP: 0,
  viseme_SS: 0,
};

export function useVisemeSync(isSpeaking: boolean, speechMouthLevel: number = 0) {
  const currentWeightsRef = useRef<VisemeWeights>({ ...DEFAULT_VISEMES });
  const targetWeightsRef = useRef<VisemeWeights>({ ...DEFAULT_VISEMES });
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [hasWebAudio, setHasWebAudio] = useState(false);

  // Initialize Web Audio analyzer if an audio source is attached
  const attachAudioElement = useCallback((audio: HTMLAudioElement) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      setHasWebAudio(true);
    } catch {
      // Browser autoplay or CORS restriction fallback
    }
  }, []);

  // Update loop called every frame by useFrame
  const updateVisemes = useCallback((delta: number, clockTime: number) => {
    const targets = targetWeightsRef.current;
    const current = currentWeightsRef.current;

    if (hasWebAudio && analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
      const data = dataArrayRef.current;
      const binCount = data.length;
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const binWidth = (sampleRate / 2) / binCount;

      // Low band: 100 - 400 Hz -> viseme_aa
      const lowStart = Math.floor(100 / binWidth);
      const lowEnd = Math.floor(400 / binWidth);
      let lowSum = 0;
      for (let i = lowStart; i <= lowEnd; i++) lowSum += data[i] || 0;
      const lowLevel = Math.min(1, (lowSum / (lowEnd - lowStart + 1)) / 180);

      // Mid band: 500 - 1500 Hz -> viseme_O, viseme_U
      const midStart = Math.floor(500 / binWidth);
      const midEnd = Math.floor(1500 / binWidth);
      let midSum = 0;
      for (let i = midStart; i <= midEnd; i++) midSum += data[i] || 0;
      const midLevel = Math.min(1, (midSum / (midEnd - midStart + 1)) / 160);

      // High band: 2000 - 4000 Hz -> viseme_SS, viseme_E
      const highStart = Math.floor(2000 / binWidth);
      const highEnd = Math.floor(4000 / binWidth);
      let highSum = 0;
      for (let i = highStart; i <= highEnd; i++) highSum += data[i] || 0;
      const highLevel = Math.min(1, (highSum / (highEnd - highStart + 1)) / 140);

      targets.viseme_aa = lowLevel * 0.9;
      targets.viseme_O = midLevel * 0.7;
      targets.viseme_U = midLevel * 0.5;
      targets.viseme_SS = highLevel * 0.8;
      targets.viseme_E = highLevel * 0.6;
      targets.viseme_I = (lowLevel + highLevel) * 0.3;
      targets.viseme_PP = lowLevel < 0.1 && (midLevel > 0.1 || highLevel > 0.1) ? 0.3 : 0;
    } else if (isSpeaking) {
      // Procedural formant synthesis when Web Speech Synthesis is active
      const baseAmp = Math.max(speechMouthLevel, 0.35);
      const t = clockTime * 12; // speech articulation frequency

      // Alternate vowel and consonant formants naturally
      const aa = Math.max(0, Math.sin(t) * baseAmp * 0.85);
      const e = Math.max(0, Math.sin(t + 1.2) * baseAmp * 0.65);
      const o = Math.max(0, Math.sin(t * 0.65) * baseAmp * 0.75);
      const u = Math.max(0, Math.cos(t * 0.8) * baseAmp * 0.5);
      const ss = Math.max(0, Math.sin(t * 1.5 + 0.8) * baseAmp * 0.45);
      const pp = Math.max(0, Math.cos(t * 2) * 0.25 * (baseAmp > 0.6 ? 1 : 0));

      targets.viseme_aa = aa;
      targets.viseme_E = e;
      targets.viseme_I = e * 0.5;
      targets.viseme_O = o;
      targets.viseme_U = u;
      targets.viseme_PP = pp;
      targets.viseme_SS = ss;
    } else {
      // Return to resting neutral mouth
      targets.viseme_aa = 0;
      targets.viseme_E = 0;
      targets.viseme_I = 0;
      targets.viseme_O = 0;
      targets.viseme_U = 0;
      targets.viseme_PP = 0;
      targets.viseme_SS = 0;
    }

    // Frame-rate independent linear interpolation with smooth damping (~0.25)
    const factor = Math.min(1, delta * 16);
    current.viseme_aa = THREE.MathUtils.lerp(current.viseme_aa, targets.viseme_aa, factor);
    current.viseme_E = THREE.MathUtils.lerp(current.viseme_E, targets.viseme_E, factor);
    current.viseme_I = THREE.MathUtils.lerp(current.viseme_I, targets.viseme_I, factor);
    current.viseme_O = THREE.MathUtils.lerp(current.viseme_O, targets.viseme_O, factor);
    current.viseme_U = THREE.MathUtils.lerp(current.viseme_U, targets.viseme_U, factor);
    current.viseme_PP = THREE.MathUtils.lerp(current.viseme_PP, targets.viseme_PP, factor);
    current.viseme_SS = THREE.MathUtils.lerp(current.viseme_SS, targets.viseme_SS, factor);

    return current;
  }, [hasWebAudio, isSpeaking, speechMouthLevel]);

  return {
    attachAudioElement,
    updateVisemes,
    weights: currentWeightsRef.current,
  };
}
