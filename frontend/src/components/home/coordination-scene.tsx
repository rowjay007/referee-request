"use client";

import type { JourneyMilestoneId } from "@/components/home/scene-model";
import { useEffect, useState } from "react";

type CoordinationSceneProps = {
  initialStage?: JourneyMilestoneId;
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
  initialStage = "packet_ready",
}: CoordinationSceneProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeStage, setActiveStage] = useState(initialStage);

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
      setActiveStage(FLOW_MOMENTS[nextIndex].id);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [activeStage, reducedMotion]);

  return (
    <>
      <div
        className="rr-reference-relay-canvas"
        data-stage={activeStage}
        aria-hidden="true"
      >
        <span className="rr-relay-line" />
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className="rr-relay-fragment"
            style={{ "--fragment-index": index } as React.CSSProperties}
          />
        ))}
        <span className="rr-relay-packet" />
        <span className="rr-relay-complete" />
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
                onClick={() => setActiveStage(moment.id)}
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
