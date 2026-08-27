"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  type CoordinationScene,
  type JourneyMilestoneId,
} from "@/components/home/scene-model";

type ReferenceRelayProps = {
  scene: CoordinationScene;
  activeStage: JourneyMilestoneId;
  reducedMotion: boolean;
};

const STAGE_PROGRESS: Record<JourneyMilestoneId, number> = {
  packet_ready: 0.08,
  sent: 0.3,
  accepted: 0.52,
  in_progress: 0.74,
  submitted: 0.96,
};

const PAPER_COLORS = ["#fffdf8", "#e8846b", "#6f93c8", "#62a48f"];

function PaperStream({
  curve,
  activeStage,
  reducedMotion,
}: {
  curve: THREE.CatmullRomCurve3;
  activeStage: JourneyMilestoneId;
  reducedMotion: boolean;
}) {
  const packetRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Group>(null);
  const progressRef = useRef(STAGE_PROGRESS.packet_ready);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const fragmentTarget = useMemo(() => new THREE.Vector3(), []);
  const targetProgress = STAGE_PROGRESS[activeStage];

  useFrame((state, delta) => {
    const packet = packetRef.current;
    const stream = streamRef.current;
    if (!packet || !stream) return;

    progressRef.current = reducedMotion
      ? targetProgress
      : THREE.MathUtils.damp(progressRef.current, targetProgress, 3.8, delta);
    curve.getPointAt(progressRef.current, point);
    curve.getTangentAt(progressRef.current, tangent);
    packet.position.copy(point);
    packet.rotation.z = Math.atan2(tangent.y, tangent.x);
    packet.rotation.x = Math.sin(progressRef.current * Math.PI * 3) * 0.16;

    const elapsed = reducedMotion ? 0 : state.clock.elapsedTime;
    stream.children.forEach((child, index) => {
      const progress = index / (stream.children.length - 1);
      if (activeStage === "packet_ready") {
        const angle = index * 1.45;
        const radius = 0.22 + progress * 0.8;
        fragmentTarget.set(
          -2.35 + Math.cos(angle) * radius,
          -0.05 + Math.sin(angle) * radius * 0.62,
          Math.sin(index * 0.7) * 0.34,
        );
      } else if (activeStage === "submitted") {
        const angle = -1.05 + progress * Math.PI * 1.25;
        fragmentTarget.set(
          2.3 + Math.cos(angle) * (0.35 + progress * 0.7),
          -0.25 + Math.sin(angle) * (0.35 + progress * 0.7),
          Math.cos(index * 0.8) * 0.28,
        );
      } else {
        curve.getPointAt(progress, fragmentTarget);
        fragmentTarget.y += Math.sin(elapsed * 0.8 + index * 0.72) * 0.055;
        fragmentTarget.z += Math.cos(elapsed * 0.65 + index * 0.48) * 0.035;
      }

      child.position.lerp(fragmentTarget, reducedMotion ? 1 : 0.055);
      child.rotation.y += reducedMotion ? 0 : delta * (index % 2 ? 0.16 : -0.12);
    });

    state.invalidate();
  });

  return (
    <>
      <group ref={streamRef}>
        {Array.from({ length: 20 }, (_, index) => {
          const progress = index / 19;
          const position = curve.getPointAt(progress);
          const direction = curve.getTangentAt(progress);
          const angle = Math.atan2(direction.y, direction.x);
          const scale = 0.65 + Math.sin(progress * Math.PI) * 0.42;

          return (
            <mesh
              key={index}
              position={position}
              rotation={[
                Math.sin(index * 1.7) * 0.34,
                Math.cos(index * 0.9) * 0.2,
                angle + (index % 2 ? 0.22 : -0.18),
              ]}
              scale={scale}
            >
              <planeGeometry args={[0.32, 0.2]} />
              <meshStandardMaterial
                color={PAPER_COLORS[index % PAPER_COLORS.length]}
                side={THREE.DoubleSide}
                roughness={0.72}
              />
            </mesh>
          );
        })}
      </group>

      <group ref={packetRef}>
        <mesh rotation={[0.08, -0.12, 0]}>
          <boxGeometry args={[0.7, 0.045, 0.48]} />
          <meshStandardMaterial color="#fffdf8" roughness={0.42} />
        </mesh>
        <mesh position={[-0.19, 0.035, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.075, 32]} />
          <meshStandardMaterial color="#dc6243" roughness={0.35} />
        </mesh>
        <mesh position={[0.1, 0.035, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.28, 0.025]} />
          <meshStandardMaterial color="#2458a6" />
        </mesh>
        <mesh position={[0.06, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.36, 0.018]} />
          <meshStandardMaterial color="#b9b1a4" />
        </mesh>
        <mesh position={[0.02, 0.035, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.44, 0.018]} />
          <meshStandardMaterial color="#b9b1a4" />
        </mesh>
      </group>
    </>
  );
}

function CompletionBloom({ active }: { active: boolean }) {
  return (
    <group position={[2.55, -0.32, -0.25]} visible={active}>
      {PAPER_COLORS.map((color, index) => {
        const angle = -0.65 + index * 0.42;
        return (
          <mesh
            key={color}
            position={[
              Math.cos(angle) * 0.42,
              Math.sin(angle) * 0.42,
              index * -0.04,
            ]}
            rotation={[0.18, -0.12, angle]}
          >
            <boxGeometry args={[0.56, 0.035, 0.38]} />
            <meshStandardMaterial color={color} roughness={0.58} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.035, 16, 48]} />
        <meshStandardMaterial color={active ? "#19745c" : "#c9c1b3"} />
      </mesh>
    </group>
  );
}

export function ReferenceRelay({
  activeStage,
  reducedMotion,
}: ReferenceRelayProps) {
  const { size } = useThree();
  const compact = size.width < 820;
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-3.1, -0.45, 0.4),
          new THREE.Vector3(-2.1, 0.28, 0.05),
          new THREE.Vector3(-0.9, -0.12, -0.2),
          new THREE.Vector3(0.15, 0.5, 0.05),
          new THREE.Vector3(1.25, 0.08, -0.25),
          new THREE.Vector3(2.65, -0.5, 0.05),
        ],
        false,
        "catmullrom",
        0.35,
      ),
    [],
  );

  return (
    <group
      position={
        compact
          ? [activeStage === "submitted" ? -1.45 : 0, -0.92, 0]
          : [0, -1.05, 0]
      }
      scale={compact ? 0.54 : 1}
    >
      <hemisphereLight args={["#fff8ea", "#9fb0c4", 1.7]} />
      <directionalLight position={[3, 5, 4]} intensity={1.8} />
      <PaperStream
        curve={curve}
        activeStage={activeStage}
        reducedMotion={reducedMotion}
      />
      <CompletionBloom active={activeStage === "submitted"} />
    </group>
  );
}