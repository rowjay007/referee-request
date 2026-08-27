"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ReferenceRelay } from "@/components/home/reference-relay";
import {
  COORDINATION_SCENE,
  type JourneyMilestoneId,
} from "@/components/home/scene-model";

type CoordinationSceneProps = {
  activeStage: JourneyMilestoneId;
  onStageChange: (stage: JourneyMilestoneId) => void;
};

const FLOW_MOMENTS = [
  { id: "packet_ready", label: "Compose", detail: "The request takes shape" },
  { id: "accepted", label: "Handoff", detail: "One clear exchange" },
  { id: "submitted", label: "Complete", detail: "The outcome opens up" },
] as const satisfies readonly {
  id: JourneyMilestoneId;
  label: string;
  detail: string;
}[];

export function CoordinationScene({
  activeStage,
  onStageChange,
}: CoordinationSceneProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const timer = window.setTimeout(() => {
      const currentIndex = FLOW_MOMENTS.findIndex(
        (moment) => moment.id === activeStage,
      );
      const nextIndex = (Math.max(currentIndex, 0) + 1) % FLOW_MOMENTS.length;
      onStageChange(FLOW_MOMENTS[nextIndex].id);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [activeStage, onStageChange, reducedMotion]);

  return (
    <>
      <div className="rr-reference-relay-canvas" aria-hidden="true">
        <Canvas
          dpr={[1, 1.5]}
          frameloop="demand"
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          camera={{ position: [0, 2.05, 6.5], fov: 31, near: 0.1, far: 30 }}
        >
          <ReferenceRelay
            scene={COORDINATION_SCENE}
            activeStage={activeStage}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>

      <ol className="rr-stage-rail" aria-label="Reference flow">
        {FLOW_MOMENTS.map((moment) => {
          const isActive = moment.id === activeStage;

          return (
            <li key={moment.id}>
              <button
                type="button"
                className="rr-stage-control"
                aria-pressed={isActive}
                aria-label={`${moment.label}: ${moment.detail}`}
                data-active={isActive ? "true" : "false"}
                onClick={() => onStageChange(moment.id)}
              >
                <span>{moment.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
