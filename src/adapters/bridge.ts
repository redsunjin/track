import { sanitizeInlineText } from "../security.js";
import type { IntermediateRoadmapSchema } from "../adapter-schema.js";
import type {
  ExternalPlanCheckpoint,
  ExternalPlanFile,
  ExternalPlanPhase,
  ExternalPlanTask,
} from "../types.js";

export function intermediateToExternalPlan(schema: IntermediateRoadmapSchema): ExternalPlanFile {
  const metadata = schema.metadata ?? {};
  const planId = sanitizeOptionalText(metadata.plan_id) ?? sanitizeInlineText(schema.project.id, `${schema.project.id}-plan`);
  const planTitle =
    sanitizeOptionalText(metadata.plan_title) ?? sanitizeInlineText(schema.project.name, `${schema.project.name} roadmap`);
  const topology = sanitizeOptionalText(metadata.topology) ?? sanitizeOptionalText(schema.project.mode) ?? "circuit";
  const phases: ExternalPlanPhase[] = schema.phases.map((phase) => ({
    id: sanitizeInlineText(phase.id, "phase"),
    title: sanitizeInlineText(phase.title, "Untitled phase"),
    goal: sanitizeOptionalText(phase.goal),
    kind: sanitizeOptionalText(phase.kind),
    difficulty: phase.difficulty,
    checkpoints: (phase.checkpoints ?? []).map((checkpoint): ExternalPlanCheckpoint => ({
      id: sanitizeInlineText(checkpoint.id, "checkpoint"),
      title: sanitizeInlineText(checkpoint.title, "Untitled checkpoint"),
      goal: sanitizeOptionalText(checkpoint.goal),
      kind: sanitizeOptionalText(checkpoint.kind),
      difficulty: checkpoint.difficulty,
      status: checkpoint.status,
      weight: checkpoint.weight,
    })),
  }));

  const checkpointPhaseMap = new Map<string, string>();
  for (const phase of phases) {
    for (const checkpoint of phase.checkpoints ?? []) {
      checkpointPhaseMap.set(checkpoint.id, phase.id);
    }
  }

  const tasks: ExternalPlanTask[] | undefined =
    schema.tasks?.map((task) => ({
      id: sanitizeInlineText(task.id, "task"),
      title: sanitizeInlineText(task.title, "Untitled task"),
      checkpoint_id: sanitizeInlineText(task.checkpoint_id, "checkpoint"),
      lap_id: sanitizeInlineText(
        task.phase_id ?? checkpointPhaseMap.get(task.checkpoint_id ?? "") ?? "lap",
        "lap"
      ),
      owner: sanitizeOptionalText(task.owner) ?? null,
      status: task.status ?? "todo",
    })) ?? undefined;

  const source =
    metadata && (typeof metadata.kind === "string" || typeof metadata.name === "string")
      ? {
          kind: sanitizeOptionalText(metadata.kind),
          name: sanitizeOptionalText(metadata.name),
        }
      : undefined;

  return {
    version: schema.version,
    project: {
      ...schema.project,
      id: sanitizeInlineText(schema.project.id, "track"),
      name: sanitizeInlineText(schema.project.name, "Track"),
      mode: sanitizeOptionalText(schema.project.mode),
    },
    plan: {
      id: planId,
      title: planTitle,
      topology,
      phases,
    },
    source,
    tasks,
  };
}

function sanitizeOptionalText(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  const normalized = sanitizeInlineText(String(value), "");
  return normalized || undefined;
}
