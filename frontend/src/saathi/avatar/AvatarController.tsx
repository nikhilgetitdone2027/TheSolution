import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useVisemeSync } from "./useVisemeSync";
import type { AvatarState } from "../../components/saathi/SaathiState";

export type { AvatarState };

interface AvatarModelProps {
  state: AvatarState;
  mouthLevel?: number;
  reducedMotion?: boolean;
}

export function AvatarModel({ state, mouthLevel = 0, reducedMotion = false }: AvatarModelProps) {
  const { scene } = useGLTF("/models/saathi.glb");
  const isSpeaking = state === "speaking";
  const { updateVisemes } = useVisemeSync(isSpeaking, mouthLevel);

  // References to bones and morph target meshes
  const spineRef = useRef<THREE.Object3D | null>(null);
  const spine2Ref = useRef<THREE.Object3D | null>(null);
  const neckRef = useRef<THREE.Object3D | null>(null);
  const headRef = useRef<THREE.Object3D | null>(null);
  const morphMeshesRef = useRef<THREE.Mesh[]>([]);

  // Initial rest transforms for bones
  const headRestRot = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
  const spine2RestRot = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));

  // Gaze & Saccadic state
  const mouseTargetRef = useRef(new THREE.Vector2(0, 0));
  const currentLookRef = useRef(new THREE.Vector2(0, 0));
  const nextSaccadeTimeRef = useRef(0);
  const saccadeOffsetRef = useRef(new THREE.Vector2(0, 0));

  // Affirmative nod & eyebrow elevation on speaking transition
  const prevStateRef = useRef<AvatarState>(state);
  const nodProgressRef = useRef<number>(-1);
  const browElevateRef = useRef<number>(0);

  // Blinking state
  const nextBlinkTimeRef = useRef(2.5);
  const isBlinkingRef = useRef(false);
  const blinkStartRef = useRef(0);
  const isDoubleBlinkRef = useRef(false);

  // Emotional posture targets
  const targetHeadRotRef = useRef(new THREE.Euler(0, 0, 0));

  useEffect(() => {
    const morphMeshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      const name = obj.name.toLowerCase();
      if (name === "spine") spineRef.current = obj;
      if (name === "spine2") {
        spine2Ref.current = obj;
        spine2RestRot.current.copy(obj.rotation);
      }
      if (name === "neck") neckRef.current = obj;
      if (name === "head") {
        headRef.current = obj;
        headRestRot.current.copy(obj.rotation);
      }
      if ((obj as THREE.Mesh).isMesh && (obj as THREE.Mesh).morphTargetDictionary) {
        morphMeshes.push(obj as THREE.Mesh);
      }
    });
    morphMeshesRef.current = morphMeshes;

    const handleMouseMove = (e: MouseEvent) => {
      if (reducedMotion) return;
      // Normalize cursor to screen space [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      // Clamped angles (+/- 15 degrees = 0.2618 rad)
      const maxAngle = 0.2618;
      const targetYaw = Math.max(-maxAngle, Math.min(maxAngle, nx * maxAngle));
      const targetPitch = Math.max(-maxAngle, Math.min(maxAngle, -ny * (maxAngle * 0.75)));
      mouseTargetRef.current.set(targetYaw, targetPitch);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [scene, reducedMotion]);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();

    // -------------------------------------------------------------
    // TRANSITION TO SPEAKING GESTURES (AFFIRMATIVE NOD & EYEBROW ELEVATION)
    // -------------------------------------------------------------
    if (prevStateRef.current !== "speaking" && state === "speaking") {
      nodProgressRef.current = 0;
      browElevateRef.current = 1.0;
    }
    prevStateRef.current = state;

    let nodAngle = 0;
    if (nodProgressRef.current >= 0) {
      nodProgressRef.current += delta * 2.4;
      if (nodProgressRef.current <= 1.0) {
        nodAngle = Math.sin(nodProgressRef.current * Math.PI) * -0.085;
      } else {
        nodProgressRef.current = -1;
      }
    }

    if (browElevateRef.current > 0) {
      browElevateRef.current = Math.max(0, browElevateRef.current - delta * 0.85);
    }

    // -------------------------------------------------------------
    // 1. IDLE DIAPHRAGMATIC BREATHING LOOP
    // -------------------------------------------------------------
    const breathPhase = Math.sin(time * 1.5);
    const breathRotX = reducedMotion ? 0 : breathPhase * 0.012;

    if (spine2Ref.current) {
      spine2Ref.current.rotation.x = spine2RestRot.current.x + breathRotX * 0.6;
    } else if (spineRef.current) {
      spineRef.current.rotation.x = breathRotX * 0.4;
    }

    // -------------------------------------------------------------
    // 2. EYE SACCADES & HEAD GAZE TRACKING (SMOOTH LERP 0.05)
    // -------------------------------------------------------------
    if (!reducedMotion) {
      if (time > nextSaccadeTimeRef.current) {
        saccadeOffsetRef.current.set(
          (Math.random() - 0.5) * 0.025,
          (Math.random() - 0.5) * 0.02
        );
        nextSaccadeTimeRef.current = time + 2.0 + Math.random() * 2.0;
      }

      currentLookRef.current.x = THREE.MathUtils.lerp(
        currentLookRef.current.x,
        mouseTargetRef.current.x + saccadeOffsetRef.current.x,
        0.05
      );
      currentLookRef.current.y = THREE.MathUtils.lerp(
        currentLookRef.current.y,
        mouseTargetRef.current.y + saccadeOffsetRef.current.y,
        0.05
      );
    }

    // Rotate neck gently (35% share)
    if (neckRef.current && !reducedMotion) {
      neckRef.current.rotation.x = THREE.MathUtils.lerp(neckRef.current.rotation.x, currentLookRef.current.y * 0.35, 0.05);
      neckRef.current.rotation.y = THREE.MathUtils.lerp(neckRef.current.rotation.y, currentLookRef.current.x * 0.35, 0.05);
    }

    // -------------------------------------------------------------
    // 3. PROCEDURAL EMOTIONAL STATES
    // -------------------------------------------------------------
    const targetRot = targetHeadRotRef.current;
    if (reducedMotion) {
      targetRot.set(headRestRot.current.x, headRestRot.current.y, headRestRot.current.z);
    } else if (state === "idle") {
      // Natural resting drift with subtle head breathing
      targetRot.set(
        headRestRot.current.x + Math.sin(time * 0.8) * 0.012 + breathRotX * 0.25,
        headRestRot.current.y + currentLookRef.current.x * 0.35,
        headRestRot.current.z
      );
    } else if (state === "listening") {
      // Attentive forward tilt with affirmative dip
      const nod = Math.sin(time * 3.0) > 0.8 ? -0.035 : -0.015;
      targetRot.set(
        headRestRot.current.x + nod,
        headRestRot.current.y + currentLookRef.current.x * 0.5 + 0.03,
        headRestRot.current.z - 0.02
      );
    } else if (state === "thinking") {
      // Head tilts up ~5 degrees, looking away
      targetRot.set(
        headRestRot.current.x + 0.087,
        headRestRot.current.y - 0.10,
        headRestRot.current.z + 0.02
      );
    } else if (state === "validating") {
      targetRot.set(
        headRestRot.current.x - 0.03,
        headRestRot.current.y + currentLookRef.current.x * 0.2,
        headRestRot.current.z
      );
    } else if (state === "analyzing") {
      targetRot.set(
        headRestRot.current.x + 0.015,
        headRestRot.current.y + Math.sin(time * 2.0) * 0.06,
        headRestRot.current.z
      );
    } else if (state === "success") {
      targetRot.set(
        headRestRot.current.x + Math.sin(time * 2.5) * 0.025,
        headRestRot.current.y,
        headRestRot.current.z
      );
    } else if (state === "speaking") {
      // Conversational head cadence nod & tilt
      const speechNod = Math.sin(time * 5.0) * 0.022;
      const speechTilt = Math.cos(time * 2.5) * 0.018;
      targetRot.set(
        headRestRot.current.x + speechNod,
        headRestRot.current.y + currentLookRef.current.x * 0.45,
        headRestRot.current.z + speechTilt
      );
    } else if (state === "error") {
      targetRot.set(
        headRestRot.current.x - 0.04,
        headRestRot.current.y + 0.04,
        headRestRot.current.z + 0.015
      );
    }

    if (headRef.current) {
      const gazeShare = reducedMotion ? 0 : 0.65;
      const targetX = targetRot.x + currentLookRef.current.y * gazeShare + nodAngle;
      const targetY = targetRot.y + currentLookRef.current.x * gazeShare;
      const targetZ = targetRot.z;
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetX, 0.05);
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetY, 0.05);
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, targetZ, 0.05);
    }

    // -------------------------------------------------------------
    // 4. NATURAL RANDOMIZED EYE BLINKING
    // -------------------------------------------------------------
    let blinkWeight = 0;
    if (time > nextBlinkTimeRef.current && !isBlinkingRef.current) {
      isBlinkingRef.current = true;
      blinkStartRef.current = time;
      isDoubleBlinkRef.current = Math.random() < 0.25;
    }

    if (isBlinkingRef.current) {
      const elapsedBlink = time - blinkStartRef.current;
      const blinkDuration = isDoubleBlinkRef.current ? 0.30 : 0.16;

      if (elapsedBlink < blinkDuration) {
        const progress = elapsedBlink / blinkDuration;
        blinkWeight = Math.sin(progress * Math.PI * (isDoubleBlinkRef.current ? 2 : 1));
        blinkWeight = Math.max(0, Math.min(1, blinkWeight * 1.15));
      } else {
        isBlinkingRef.current = false;
        nextBlinkTimeRef.current = time + 3.0 + Math.random() * 3.5;
      }
    }

    // -------------------------------------------------------------
    // 5. MOUTH & FACIAL MORPH TARGET ANIMATION (SPEECH, BROWS & VISEMES)
    // -------------------------------------------------------------
    const visemes = updateVisemes(delta, time);
    const setMorph = (name: string, val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      for (const mesh of morphMeshesRef.current) {
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const idx = mesh.morphTargetDictionary[name];
          if (idx !== undefined && mesh.morphTargetInfluences[idx] !== undefined) {
            mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
              mesh.morphTargetInfluences[idx],
              clamped,
              delta * 20
            );
          }
        }
      }
    };

    // Gentle eye blinks
    setMorph("eyeBlinkLeft", blinkWeight);
    setMorph("eyeBlinkRight", blinkWeight);
    setMorph("eyeBlink", blinkWeight);

    // Conversational eyebrow elevation
    setMorph("browInnerUp", browElevateRef.current * 0.55);

    // Speech audio analyser / mouth level mapping with balanced blend weights
    const mouthOpenness = isSpeaking ? Math.min(0.65, Math.max(mouthLevel * 0.7, visemes.viseme_aa * 0.6)) : 0;
    setMorph("mouthOpen", mouthOpenness * 0.60);
    setMorph("jawOpen", mouthOpenness * 0.40);
    setMorph("viseme_aa", visemes.viseme_aa * 0.35);
    setMorph("viseme_O", visemes.viseme_O * 0.35);
    setMorph("viseme_E", state === "success" ? Math.max(visemes.viseme_E * 0.3, 0.25) : visemes.viseme_E * 0.3);
    setMorph("viseme_I", visemes.viseme_I * 0.25);
    setMorph("viseme_U", visemes.viseme_U * 0.25);
    setMorph("viseme_PP", visemes.viseme_PP * 0.25);
    setMorph("viseme_SS", visemes.viseme_SS * 0.25);
  });

  return <primitive object={scene} position={[0, -0.18, 0]} scale={[1, 1, 1]} />;
}

// Pre-load the Avaturn glb model
useGLTF.preload("/models/saathi.glb");
