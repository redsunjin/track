import type { TrackRoadmapFile, TrackStateFile } from "./types.js";

export type TrackInitTemplateName = "simple";

export interface TrackInitTemplateInput {
  projectId: string;
  projectName: string;
}

export interface TrackInitProjection {
  roadmap: TrackRoadmapFile;
  state: TrackStateFile;
}

export interface TrackInitTemplateDefinition {
  description: string;
  name: TrackInitTemplateName;
  project(input: TrackInitTemplateInput): TrackInitProjection;
}

export const SIMPLE_TRACK_INIT_TEMPLATE: TrackInitTemplateDefinition = {
  name: "simple",
  description: "A minimal one-lap Track roadmap with one active checkpoint and task.",
  project: projectSimpleTrackInit,
};

export function listTrackInitTemplates(): TrackInitTemplateDefinition[] {
  return [SIMPLE_TRACK_INIT_TEMPLATE];
}

export function resolveTrackInitTemplate(template?: string): TrackInitTemplateDefinition {
  if (!template || template === SIMPLE_TRACK_INIT_TEMPLATE.name) {
    return SIMPLE_TRACK_INIT_TEMPLATE;
  }

  throw new Error(`Unknown Track init template \`${template}\`. Available templates: simple.`);
}

export function projectSimpleTrackInit(input: TrackInitTemplateInput): TrackInitProjection {
  const phaseId = "phase-1";
  const firstCheckpointId = "cp-1";
  const secondCheckpointId = "cp-2";
  const thirdCheckpointId = "cp-3";
  const taskId = "task-001";
  const firstAction = "Define the first usable slice";

  const roadmap: TrackRoadmapFile = {
    version: 1,
    project: {
      id: input.projectId,
      name: input.projectName,
      mode: "simple",
    },
    roadmap: {
      phases: [
        {
          id: phaseId,
          title: "First lap",
          goal: "Turn the project into a visible, trackable first slice.",
          kind: "build",
          checkpoints: [
            {
              id: firstCheckpointId,
              title: "First usable slice",
              goal: firstAction,
              kind: "build",
            },
            {
              id: secondCheckpointId,
              title: "Implementation pass",
              goal: "Make the first slice real in the codebase.",
              kind: "build",
            },
            {
              id: thirdCheckpointId,
              title: "Validation pass",
              goal: "Run Track status, map, and project checks.",
              kind: "release",
            },
          ],
        },
      ],
    },
  };

  const state: TrackStateFile = {
    version: 1,
    project: {
      id: input.projectId,
      name: input.projectName,
      mode: "simple",
    },
    track: {
      id: `${input.projectId}-track`,
      title: `${input.projectName} roadmap`,
      topology: "simple",
      total_laps: 1,
      active_lap: 1,
      percent_complete: 0,
      health: "green",
      next_action: firstAction,
      blocked_reason: null,
    },
    laps: [
      {
        id: phaseId,
        title: "First lap",
        status: "doing",
        checkpoints: [
          {
            id: firstCheckpointId,
            title: "First usable slice",
            status: "doing",
            weight: 1,
          },
          {
            id: secondCheckpointId,
            title: "Implementation pass",
            status: "todo",
            weight: 1,
          },
          {
            id: thirdCheckpointId,
            title: "Validation pass",
            status: "todo",
            weight: 1,
          },
        ],
      },
    ],
    tasks: [
      {
        id: taskId,
        title: firstAction,
        lap_id: phaseId,
        checkpoint_id: firstCheckpointId,
        status: "doing",
        owner: null,
      },
    ],
    flags: [],
    events: [],
  };

  return { roadmap, state };
}
