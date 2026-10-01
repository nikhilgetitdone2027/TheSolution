import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface ReactorDigitalTwinProps {
  temperatureC: number;
  pePpFraction?: number; // 0 to 1
  residenceTimeMin?: number;
  feedRateKgH?: number;
  className?: string;
}

// Compute thermal emissive color based on temperature
function getThermalColorAndIntensity(temp: number): { emissive: THREE.Color; lightColor: string; intensity: number; label: string } {
  if (temp < 440) {
    // 400 - 440: Cool dark metallic with subtle amber glow
    return {
      emissive: new THREE.Color("#78350f"),
      lightColor: "#d97706",
      intensity: 0.45,
      label: "Initial Pyrolysis / Low-Temp",
    };
  } else if (temp <= 540) {
    // 440 - 540: Moderate orange glow
    const factor = (temp - 440) / 100;
    const color = new THREE.Color("#c2410c").lerp(new THREE.Color("#ea580c"), factor);
    return {
      emissive: color,
      lightColor: "#f97316",
      intensity: 0.9 + factor * 0.4,
      label: "Optimal Liquid Fuel Cracking",
    };
  } else {
    // 540 - 700+: High-heat bright crimson to white-hot thermal gradient
    const factor = Math.min(1.0, (temp - 540) / 160);
    const color = new THREE.Color("#dc2626").lerp(new THREE.Color("#fef08a"), factor * 0.7);
    return {
      emissive: color,
      lightColor: factor > 0.6 ? "#ffedd5" : "#ef4444",
      intensity: 1.4 + factor * 1.5,
      label: "High-Heat Syngas Reforming",
    };
  }
}

function ReactorModel({
  temperatureC,
  pePpFraction = 0.65,
}: {
  temperatureC: number;
  pePpFraction?: number;
}) {
  const kilnRef = useRef<THREE.Mesh | null>(null);
  const thermalInfo = useMemo(() => getThermalColorAndIntensity(temperatureC), [temperatureC]);

  // Particle System 1: Condensable Hydrocarbon Vapor (to Condenser)
  const vaporCount = Math.floor(60 + pePpFraction * 140);
  const vaporPointsRef = useRef<THREE.Points | null>(null);
  const vaporData = useMemo(() => {
    const pos = new Float32Array(vaporCount * 3);
    const speeds = new Float32Array(vaporCount);
    for (let i = 0; i < vaporCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      speeds[i] = 0.3 + Math.random() * 0.7;
    }
    return { pos, speeds };
  }, [vaporCount]);

  // Particle System 2: Non-condensable Syngas (to Exhaust Valve)
  const syngasCount = 50;
  const syngasPointsRef = useRef<THREE.Points | null>(null);
  const syngasData = useMemo(() => {
    const pos = new Float32Array(syngasCount * 3);
    const speeds = new Float32Array(syngasCount);
    for (let i = 0; i < syngasCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = 1.3 + Math.random() * 0.9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      speeds[i] = 0.8 + Math.random() * 1.2;
    }
    return { pos, speeds };
  }, [syngasCount]);

  useFrame((_, delta) => {
    // Gentle kiln thermal breathing
    if (kilnRef.current) {
      kilnRef.current.rotation.y += delta * 0.15;
    }

    // Animate vapor particles: flowing along horizontal kiln toward condenser (+X direction)
    if (vaporPointsRef.current) {
      const positions = vaporPointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < vaporCount; i++) {
        // Move towards condenser at +X, +Y
        positions[i * 3] += delta * (0.6 + pePpFraction * 0.8) * vaporData.speeds[i];
        positions[i * 3 + 1] += delta * 0.2 * Math.sin(positions[i * 3] * 3);
        // Reset when reaching condenser pipe
        if (positions[i * 3] > 1.8) {
          positions[i * 3] = -0.9 + (Math.random() - 0.5) * 0.2;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
        }
      }
      vaporPointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Animate syngas particles: velocity increases with temperature
    if (syngasPointsRef.current) {
      const positions = syngasPointsRef.current.geometry.attributes.position.array as Float32Array;
      const tempVelocity = 0.5 + Math.max(0, (temperatureC - 400) / 250) * 1.5;
      for (let i = 0; i < syngasCount; i++) {
        positions[i * 3 + 1] += delta * tempVelocity * syngasData.speeds[i];
        if (positions[i * 3 + 1] > 2.6) {
          positions[i * 3 + 1] = 1.35;
          positions[i * 3] = (Math.random() - 0.5) * 0.2;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }
      }
      syngasPointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={[0, -0.2, 0]}>
      {/* 1. Main Horizontal Pyrolysis Rotary Kiln / Reaction Chamber */}
      <mesh ref={kilnRef} position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.75, 0.75, 2.4, 32]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.88}
          roughness={0.32}
          emissive={thermalInfo.emissive}
          emissiveIntensity={thermalInfo.intensity}
        />
      </mesh>

      {/* Internal Thermal Radiance Point Light */}
      <pointLight position={[0, 0.4, 0]} color={thermalInfo.lightColor} intensity={thermalInfo.intensity * 2.5} distance={4} />

      {/* Structural Kiln Reinforcement Rings */}
      {[-0.8, -0.2, 0.4, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.77, 0.035, 16, 32]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* 2. Inlet Feed Hopper (Top Left - Conical) */}
      <group position={[-0.95, 1.35, 0]}>
        {/* Feed Cone */}
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.5, 0.7, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Feed Neck Pipe */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.4, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* 3. Condenser Collection Duct & Column (Right Side) */}
      <group position={[1.4, 0.5, 0]}>
        {/* Horizontal take-off arm */}
        <mesh position={[-0.2, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.5, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* Vertical Condenser Column */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 1.5, 24]} />
          <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.2} />
        </mesh>
        {/* Condenser Cooling Fins */}
        {[-0.5, -0.25, 0, 0.25, 0.5].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.04, 24]} />
            <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        {/* Oil Receiver Vessel (Base) */}
        <mesh position={[0, -0.95, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.4, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>

      {/* 4. Syngas Non-Condensable Exhaust Valve & Flare Stack (Top Center) */}
      <group position={[0.2, 1.45, 0]}>
        {/* Exhaust Riser Tube */}
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.9, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Flanged Pressure Valve */}
        <mesh position={[0, 0.25, 0]}>
          <torusGeometry args={[0.16, 0.04, 12, 24]} />
          <meshStandardMaterial color="#dc2626" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* 5. Industrial Steel Support Cradle & Stanchions */}
      <group position={[0, -0.55, 0]}>
        {/* Concrete Foundation Slab */}
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[3.4, 0.18, 1.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Left & Right A-Frame Stanchions */}
        {[-0.7, 0.7].map((x, i) => (
          <mesh key={i} position={[x, 0.35, 0]}>
            <boxGeometry args={[0.14, 0.8, 1.2]} />
            <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Particle System 1: Condensable Hydrocarbon Vapor (Points) */}
      <points ref={vaporPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[vaporData.pos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color={thermalInfo.lightColor}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Particle System 2: Non-condensable Syngas Steam (Points) */}
      <points ref={syngasPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[syngasData.pos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.075}
          color={temperatureC > 550 ? "#fef08a" : "#93c5fd"}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export function ReactorDigitalTwin3D({
  temperatureC,
  pePpFraction = 0.65,
  residenceTimeMin = 45,
  feedRateKgH = 100,
  className = "",
}: ReactorDigitalTwinProps) {
  const thermalInfo = useMemo(() => getThermalColorAndIntensity(temperatureC), [temperatureC]);

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border border-line bg-card/90 shadow-xl backdrop-blur-md ${className}`}>
      {/* Top Status Bar / Industrial HUD */}
      <div className="flex flex-wrap items-center justify-between border-b border-line/60 bg-panel/70 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
          <span className="font-mono uppercase tracking-wider text-muted">Pyrolysis Digital Twin · 3D</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-muted">Core Temp:</span>
          <span
            className="font-bold tabular-nums"
            style={{ color: thermalInfo.lightColor }}
          >
            {temperatureC.toFixed(1)} °C
          </span>
          <span className="rounded bg-panel/90 px-1.5 py-0.5 text-[10px] text-muted">
            {thermalInfo.label}
          </span>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative h-64 w-full cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [2.5, 1.8, 3.2], fov: 42 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 5, 4]} intensity={1.2} />
          <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#60a5fa" />
          <ReactorModel temperatureC={temperatureC} pePpFraction={pePpFraction} />
          <OrbitControls
            enablePan={false}
            minDistance={2.0}
            maxDistance={5.5}
            maxPolarAngle={Math.PI / 2 + 0.05}
          />
        </Canvas>

        {/* Dynamic Thermal Telemetry Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 rounded-lg bg-panel/85 p-2.5 font-mono text-[11px] backdrop-blur-md border border-line/40">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">PE/PP Fraction:</span>
            <span className="font-semibold text-emerald-400">{(pePpFraction * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Vapor Density:</span>
            <span className="font-semibold text-amber-300">
              {pePpFraction > 0.5 ? "Dense (High Oil)" : "Moderate"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Syngas Cracking:</span>
            <span className="font-semibold text-cyan-300">
              {temperatureC > 520 ? "Active Rapid" : "Base Evolution"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-line/30 text-[10px]">
            <span className="text-muted">Residence / Feed:</span>
            <span className="text-slate-300">
              {residenceTimeMin.toFixed(0)} min · {feedRateKgH.toFixed(0)} kg/h
            </span>
          </div>
        </div>

        {/* Rotation Hint */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-panel/60 px-2 py-0.5 font-mono text-[10px] text-muted backdrop-blur-sm">
          Drag to rotate 3D kiln
        </div>
      </div>
    </div>
  );
}
