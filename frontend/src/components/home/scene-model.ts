export const JOURNEY_MILESTONE_IDS = [
  "packet_ready",
  "sent",
  "accepted",
  "in_progress",
  "submitted",
] as const;

export type JourneyMilestoneId = (typeof JOURNEY_MILESTONE_IDS)[number];

export type Vector3Tuple = readonly [number, number, number];

export type Actor = Readonly<{
  id: "candidate" | "referee";
  label: string;
  role: string;
  position: Vector3Tuple;
  color: string;
}>;

export type JourneyMilestone = Readonly<{
  id: JourneyMilestoneId;
  label: string;
  detail: string;
  tabColor: string;
}>;

export type DestinationFrame = Readonly<{
  id: string;
  category: "University" | "Employer" | "Scholarship" | "Professional body";
  position: Vector3Tuple;
  accent: string;
}>;

export type RoutePosition = Readonly<{
  id: JourneyMilestoneId;
  point: Vector3Tuple;
}>;

export type CoordinationScene = Readonly<{
  name: "Reference Relay";
  actors: readonly Actor[];
  journeyMilestones: readonly JourneyMilestone[];
  destinationFrames: readonly DestinationFrame[];
  routePositions: readonly RoutePosition[];
  activeStage: JourneyMilestoneId;
}>;

const routePositions = [
  { id: "packet_ready", point: [-2.2, 0.14, 1.1] },
  { id: "sent", point: [-1.1, 0.14, 0.56] },
  { id: "accepted", point: [0.1, 0.14, 0.2] },
  { id: "in_progress", point: [1.25, 0.14, -0.24] },
  { id: "submitted", point: [2.25, 0.14, -0.72] },
] as const satisfies readonly RoutePosition[];

export const COORDINATION_SCENE = {
  name: "Reference Relay",
  actors: [
    {
      id: "candidate",
      label: "Candidate",
      role: "Builds the packet once",
      position: [-3.02, 0.14, 1.4],
      color: "#2458a6",
    },
    {
      id: "referee",
      label: "Referee",
      role: "Submits through one secure link",
      position: [0.74, 0.14, 0.06],
      color: "#19745c",
    },
  ],
  journeyMilestones: [
    {
      id: "packet_ready",
      label: "Packet ready",
      detail: "Context, files, deadline, secure link",
      tabColor: "#dc6243",
    },
    {
      id: "sent",
      label: "Sent",
      detail: "Delivered through email or message",
      tabColor: "#b88924",
    },
    {
      id: "accepted",
      label: "Accepted",
      detail: "Referee confirms and opens the request",
      tabColor: "#2458a6",
    },
    {
      id: "in_progress",
      label: "In progress",
      detail: "Drafting while materials stay in one place",
      tabColor: "#19745c",
    },
    {
      id: "submitted",
      label: "Submitted",
      detail: "Reference completed through the secure request",
      tabColor: "#172126",
    },
  ],
  destinationFrames: [
    {
      id: "destination-university",
      category: "University",
      position: [3.24, 0.72, -1.2],
      accent: "#2458a6",
    },
    {
      id: "destination-employer",
      category: "Employer",
      position: [3.24, 0.4, -0.46],
      accent: "#dc6243",
    },
    {
      id: "destination-scholarship",
      category: "Scholarship",
      position: [3.24, 0.08, 0.28],
      accent: "#b88924",
    },
    {
      id: "destination-professional",
      category: "Professional body",
      position: [3.24, -0.24, 1.02],
      accent: "#19745c",
    },
  ],
  routePositions,
  activeStage: "packet_ready",
} as const satisfies CoordinationScene;

export const MILESTONE_REGISTRY = COORDINATION_SCENE.journeyMilestones;

export const ROUTE_POSITION_MAP = COORDINATION_SCENE.routePositions.reduce<
  Record<JourneyMilestoneId, Vector3Tuple>
>((accumulator, routePosition) => {
  accumulator[routePosition.id] = routePosition.point;
  return accumulator;
}, {} as Record<JourneyMilestoneId, Vector3Tuple>);
