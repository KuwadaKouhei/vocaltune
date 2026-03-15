"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { NoteInfo } from "@/lib/pitch/types";

// デフォルト表示範囲
const DEFAULT_MIDI_MIN = 48;
const DEFAULT_MIDI_MAX = 84;
const MIN_DISPLAY_RANGE = 24;
const DISPLAY_MARGIN = 6;
const LERP_SPEED = 0.06;

interface Visualizer3DProps {
  pitchHistory: (number | null)[];
  currentNote: NoteInfo | null;
  isListening: boolean;
}

interface RangeTarget {
  min: number;
  max: number;
}

function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}

function useRangeTarget(pitchHistory: (number | null)[]): RangeTarget {
  return useMemo(() => {
    let minMidi = DEFAULT_MIDI_MAX;
    let maxMidi = DEFAULT_MIDI_MIN;
    let hasData = false;

    for (const freq of pitchHistory) {
      if (freq !== null) {
        const semitone = 12 * Math.log2(freq / 440);
        const midi = semitone + 69;
        if (midi < minMidi) minMidi = midi;
        if (midi > maxMidi) maxMidi = midi;
        hasData = true;
      }
    }

    if (!hasData) {
      return { min: DEFAULT_MIDI_MIN, max: DEFAULT_MIDI_MAX };
    }

    let lo = Math.floor(minMidi) - DISPLAY_MARGIN;
    let hi = Math.ceil(maxMidi) + DISPLAY_MARGIN;

    const range = hi - lo;
    if (range < MIN_DISPLAY_RANGE) {
      const center = (lo + hi) / 2;
      lo = Math.floor(center - MIN_DISPLAY_RANGE / 2);
      hi = Math.ceil(center + MIN_DISPLAY_RANGE / 2);
    }

    lo = Math.max(24, lo);
    hi = Math.min(108, hi);

    return { min: lo, max: hi };
  }, [pitchHistory]);
}

/**
 * ピッチ履歴を3D波形リボンとして描画
 */
function PitchRibbon({
  pitchHistory,
  target,
}: {
  pitchHistory: (number | null)[];
  target: RangeTarget;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const displayMinRef = useRef(DEFAULT_MIDI_MIN);
  const displayMaxRef = useRef(DEFAULT_MIDI_MAX);

  const maxPoints = 200;

  const { positions, colors, indices } = useMemo(() => {
    const pos = new Float32Array(maxPoints * 2 * 3);
    const col = new Float32Array(maxPoints * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i < maxPoints - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      idx.push(a, b, c, b, d, c);
    }
    return { positions: pos, colors: col, indices: new Uint16Array(idx) };
  }, []);

  useFrame(() => {
    if (!geometryRef.current) return;

    displayMinRef.current = lerp(displayMinRef.current, target.min, LERP_SPEED);
    displayMaxRef.current = lerp(displayMaxRef.current, target.max, LERP_SPEED);
    const midiMin = displayMinRef.current;
    const midiRange = displayMaxRef.current - midiMin;

    const len = pitchHistory.length;
    const ribbonWidth = 0.15;

    for (let i = 0; i < maxPoints; i++) {
      const histIdx = len - maxPoints + i;
      const freq = histIdx >= 0 && histIdx < len ? pitchHistory[histIdx] : null;

      const x = ((i - maxPoints) / maxPoints) * 10;

      let y = 0;
      if (freq !== null) {
        const semitone = 12 * Math.log2(freq / 440);
        const midi = semitone + 69;
        y = ((midi - midiMin) / midiRange) * 6 - 3;
      }

      positions[i * 6] = x;
      positions[i * 6 + 1] = y + ribbonWidth;
      positions[i * 6 + 2] = 0;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y - ribbonWidth;
      positions[i * 6 + 5] = 0;

      const alpha = freq !== null ? 0.3 + 0.7 * (i / maxPoints) : 0;
      const r = 0;
      const g = alpha * 0.9;
      const b = alpha;

      colors[i * 6] = r;
      colors[i * 6 + 1] = g;
      colors[i * 6 + 2] = b;
      colors[i * 6 + 3] = r;
      colors[i * 6 + 4] = g;
      colors[i * 6 + 5] = b;
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.color.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [positions, colors, indices]);

  geometryRef.current = geometry;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * 検出中の音を球体パーティクルで表現
 */
function CurrentPitchOrb({
  currentNote,
  isListening,
  target,
}: {
  currentNote: NoteInfo | null;
  isListening: boolean;
  target: RangeTarget;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const displayMinRef = useRef(DEFAULT_MIDI_MIN);
  const displayMaxRef = useRef(DEFAULT_MIDI_MAX);

  useFrame(({ clock }) => {
    if (!meshRef.current || !glowRef.current) return;

    displayMinRef.current = lerp(displayMinRef.current, target.min, LERP_SPEED);
    displayMaxRef.current = lerp(displayMaxRef.current, target.max, LERP_SPEED);
    const midiMin = displayMinRef.current;
    const midiRange = displayMaxRef.current - midiMin;

    if (currentNote && isListening) {
      const y =
        ((currentNote.midi + currentNote.cents / 100 - midiMin) / midiRange) *
          6 -
        3;

      meshRef.current.position.set(0.2, y, 0);
      glowRef.current.position.set(0.2, y, 0);

      const absCents = Math.abs(currentNote.cents);
      const scale = absCents < 10 ? 1.2 : absCents < 25 ? 0.9 : 0.6;
      const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.1;

      meshRef.current.scale.setScalar(scale * pulse);
      glowRef.current.scale.setScalar(scale * pulse * 2.5);

      meshRef.current.visible = true;
      glowRef.current.visible = true;

      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      if (absCents < 10) {
        material.color.setHex(0x00e5ff);
      } else if (absCents < 25) {
        material.color.setHex(0xffc400);
      } else {
        material.color.setHex(0xff3d71);
      }
    } else {
      meshRef.current.visible = false;
      glowRef.current.visible = false;
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.1} />
      </mesh>
    </>
  );
}

/**
 * グリッド線（各オクターブのC） — useFrame内で滑らかに更新
 */
function PitchGrid({ target }: { target: RangeTarget }) {
  const groupRef = useRef<THREE.Group>(null);
  const displayMinRef = useRef(DEFAULT_MIDI_MIN);
  const displayMaxRef = useRef(DEFAULT_MIDI_MAX);

  // C1〜C8 までのグリッドラインを事前に作成
  const gridLines = useMemo(() => {
    const lines: { midi: number; line: THREE.Line }[] = [];
    for (let midi = 24; midi <= 108; midi += 12) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([-10, 0, 0, 0.5, 0, 0], 3)
      );
      const mat = new THREE.LineBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.08,
      });
      const line = new THREE.Line(geo, mat);
      lines.push({ midi, line });
    }
    return lines;
  }, []);

  useFrame(() => {
    displayMinRef.current = lerp(displayMinRef.current, target.min, LERP_SPEED);
    displayMaxRef.current = lerp(displayMaxRef.current, target.max, LERP_SPEED);
    const midiMin = displayMinRef.current;
    const midiRange = displayMaxRef.current - midiMin;

    for (const { midi, line } of gridLines) {
      const y = ((midi - midiMin) / midiRange) * 6 - 3;
      line.position.y = y;
      line.visible = midi >= midiMin - 1 && midi <= displayMaxRef.current + 1;
    }
  });

  return (
    <group ref={groupRef}>
      {gridLines.map(({ midi, line }) => (
        <primitive key={midi} object={line} />
      ))}
    </group>
  );
}

/**
 * 浮遊パーティクル（背景演出）
 */
function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const count = 100;
  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      spd[i] = 0.005 + Math.random() * 0.01;
    }
    return { positions: pos, speeds: spd };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      arr[i * 3] += speeds[i];
      if (arr[i * 3] > 10) arr[i * 3] = -10;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial color="#00e5ff" size={0.04} transparent opacity={0.3} />
    </points>
  );
}

export default function Visualizer3D({
  pitchHistory,
  currentNote,
  isListening,
}: Visualizer3DProps) {
  const target = useRangeTarget(pitchHistory);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: "#0a0a0f" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#00e5ff" />

        <PitchGrid target={target} />
        <PitchRibbon pitchHistory={pitchHistory} target={target} />
        <CurrentPitchOrb currentNote={currentNote} isListening={isListening} target={target} />
        <FloatingParticles />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={4}
          maxDistance={15}
          autoRotate={!isListening}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
