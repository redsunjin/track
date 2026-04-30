export type TrackBuilderMethodKind = "gsd" | "sdd" | "tdd" | "harness";

export interface TrackBuilderMethod {
  bestFor: string;
  kind: TrackBuilderMethodKind;
  label: string;
  output: string;
}

export interface TrackBuilderGuidance {
  confidence: "low" | "medium";
  methods: TrackBuilderMethod[];
  needed: boolean;
  nextActions: string[];
  reason: string;
}

export interface BuildTrackBuilderGuidanceInput {
  context?: "bootstrap" | "init";
  evidenceLabels?: string[];
  hasPlanEvidence: boolean;
}

export const TRACK_BUILDER_METHODS: TrackBuilderMethod[] = [
  {
    kind: "gsd",
    label: "GSD",
    bestFor: "fast MVP or unclear first slice",
    output: "goal, done criteria, and the next 3 actions",
  },
  {
    kind: "sdd",
    label: "SDD",
    bestFor: "spec-first work where requirements matter",
    output: "spec, acceptance criteria, roadmap phases, and tasks",
  },
  {
    kind: "tdd",
    label: "TDD",
    bestFor: "behavior that can be proven with tests",
    output: "red/green/refactor checkpoints and validation gates",
  },
  {
    kind: "harness",
    label: "Harness",
    bestFor: "agent-driven projects that need repeatable checks",
    output: ".agent contract, definition of done, and validation scripts",
  },
];

const PLAN_HEADING_PATTERN =
  /\b(roadmap|plan|plans|todo|backlog|milestone|goal|goals|spec|specification|acceptance|definition of done|next steps?)\b/i;

export function buildTrackBuilderGuidance(input: BuildTrackBuilderGuidanceInput): TrackBuilderGuidance {
  if (input.hasPlanEvidence) {
    const evidence = input.evidenceLabels?.length ? input.evidenceLabels.join(", ") : "local planning evidence";
    return {
      confidence: "medium",
      methods: TRACK_BUILDER_METHODS,
      needed: false,
      nextActions: ["Review the detected plan evidence before writing .track files."],
      reason: `Found planning evidence from ${evidence}.`,
    };
  }

  const initReason =
    "track init can create starter files, but no roadmap, spec, TODO, or harness source has been selected yet.";
  const bootstrapReason = "No explicit roadmap, plan, TODO, spec, or harness evidence was found.";

  return {
    confidence: "low",
    methods: TRACK_BUILDER_METHODS,
    needed: true,
    nextActions: [
      "Choose GSD, SDD, TDD, or Harness before writing .track files.",
      "Capture the goal and done criteria in README, ROADMAP, or TODO, then re-run track bootstrap --dry-run.",
      "Use track init --template simple only when a minimal starter plan is enough.",
    ],
    reason: input.context === "init" ? initReason : bootstrapReason,
  };
}

export function hasTrackPlanningHeading(headings: string[]): boolean {
  return headings.some((heading) => PLAN_HEADING_PATTERN.test(heading));
}

export function renderTrackBuilderGuidance(guidance: TrackBuilderGuidance): string[] {
  if (!guidance.needed) {
    return [];
  }

  return [
    "TRACK BUILDER",
    `Reason: ${guidance.reason}`,
    "",
    "Method options:",
    ...guidance.methods.map((method) => `- ${method.label}: ${method.bestFor}; output: ${method.output}`),
    "",
    "Next:",
    ...guidance.nextActions.map((action) => `- ${action}`),
  ];
}
