import path from "node:path";

import { intermediateToExternalPlan } from "./adapters/bridge.js";
import { createRoadmapAdapter, resolveRoadmapAdapterSourcePath } from "./adapters/registry.js";
import { resolveTrackFilePath, sanitizeInlineText } from "./security.js";
import { saveTrackRoadmap } from "./roadmap.js";
import { saveTrackState } from "./state.js";
import type {
  Checkpoint,
  ExternalPlanCheckpoint,
  ExternalPlanFile,
  ExternalPlanPhase,
  ExternalPlanTask,
  Flag,
  Lap,
  ProjectExternalPlanResult,
  RoadmapCheckpoint,
  RoadmapPhase,
  Task,
  TrackHealth,
  TrackRoadmapFile,
  TrackStateFile,
  TrackStatus,
} from "./types.js";

export interface ImportExternalPlanOptions {
  cwd: string;
  adapterKind?: string;
  dryRun?: boolean;
  existingState?: TrackStateFile;
  preserveProgress?: boolean;
  sourceFile?: string;
  stateOutFile?: string;
  roadmapOutFile?: string;
}

export async function resolveExternalPlanPath(
  cwd: string,
  explicitFile?: string,
  adapterKind?: string
): Promise<string> {
  return resolveRoadmapAdapterSourcePath(cwd, adapterKind, explicitFile);
}

export async function loadExternalPlan(
  cwd: string,
  explicitFile?: string,
  adapterKind?: string
): Promise<ExternalPlanFile> {
  const adapter = await createRoadmapAdapter({
    cwd,
    adapterKind,
    sourceFile: explicitFile,
  });
  await adapter.fetch();
  const converted = intermediateToExternalPlan(await adapter.toInternalSchema());
  validateExternalPlan(converted);
  return converted;
}

export function projectExternalPlan(
  plan: ExternalPlanFile,
  options?: { existingState?: TrackStateFile; preserveProgress?: boolean }
): ProjectExternalPlanResult {
  const existingState = options?.existingState;
  const preserveProgress = options?.preserveProgress ?? true;
  const taskIds = new Set<string>();

  const roadmapPhases = plan.plan.phases.map((phase) => projectRoadmapPhase(phase));

  const tasks = projectTasks(plan.tasks ?? [], plan.plan.phases, existingState, preserveProgress, taskIds);
  const laps = plan.plan.phases.map((phase) => projectLap(phase, tasks, existingState, preserveProgress));

  const activeLap = deriveActiveLap(laps);
  const flags = preserveProgress ? preserveRelevantFlags(existingState?.flags ?? [], taskIds) : [];
  const blockedReason = deriveBlockedReason(flags);
  const health = deriveHealth(flags, blockedReason);
  const nextAction = deriveNextAction(tasks, laps);
  const percentComplete = computePercentFromCheckpoints(laps.flatMap((lap) => lap.checkpoints ?? []));

  const roadmap: TrackRoadmapFile = {
    version: plan.version,
    project: {
      ...plan.project,
      name: sanitizeInlineText(plan.project.name, "Track"),
      mode: sanitizeInlineText(plan.project.mode, plan.plan.topology ?? "circuit"),
    },
    roadmap: {
      phases: roadmapPhases,
    },
  };

  const state: TrackStateFile = {
    version: plan.version,
    project: {
      ...plan.project,
      name: sanitizeInlineText(plan.project.name, "Track"),
      mode: sanitizeInlineText(plan.project.mode, plan.plan.topology ?? "circuit"),
    },
    track: {
      id: sanitizeInlineText(plan.plan.id, `${plan.project.id}-track`),
      title: sanitizeInlineText(plan.plan.title, `${plan.project.name} roadmap`),
      topology: sanitizeInlineText(plan.plan.topology, plan.project.mode ?? "circuit"),
      total_laps: laps.length,
      active_lap: activeLap,
      percent_complete: percentComplete,
      health,
      next_action: nextAction,
      blocked_reason: blockedReason,
    },
    laps,
    tasks,
    flags,
    events: preserveProgress ? [...(existingState?.events ?? [])] : [],
  };

  return { roadmap, state };
}

export async function importExternalPlan(options: ImportExternalPlanOptions): Promise<ProjectExternalPlanResult> {
  const plan = await loadExternalPlan(options.cwd, options.sourceFile, options.adapterKind);
  const result = projectExternalPlan(plan, {
    existingState: options.existingState,
    preserveProgress: options.preserveProgress,
  });

  if (options.dryRun) {
    return result;
  }

  const roadmapPath = options.roadmapOutFile
    ? await resolveTrackFilePath(options.cwd, options.roadmapOutFile, "Track roadmap output")
    : path.resolve(options.cwd, ".track/roadmap.yaml");
  const statePath = options.stateOutFile
    ? await resolveTrackFilePath(options.cwd, options.stateOutFile, "Track state output")
    : path.resolve(options.cwd, ".track/state.yaml");

  await saveTrackRoadmap(roadmapPath, result.roadmap);
  await saveTrackState(statePath, result.state);

  return result;
}

export function summarizeExternalPlanImport(result: ProjectExternalPlanResult): string {
  const phaseCount = result.roadmap.roadmap.phases.length;
  const checkpointCount = result.roadmap.roadmap.phases.reduce((count, phase) => count + (phase.checkpoints?.length ?? 0), 0);
  const taskCount = result.state.tasks?.length ?? 0;
  return `Projected ${phaseCount} phases, ${checkpointCount} checkpoints, and ${taskCount} tasks into Track.`;
}

function projectRoadmapPhase(phase: ExternalPlanPhase): RoadmapPhase {
  return {
    id: sanitizeInlineText(phase.id, "phase"),
    title: sanitizeInlineText(phase.title, "Untitled phase"),
    goal: sanitizeOptionalText(phase.goal),
    kind: sanitizeOptionalText(phase.kind),
    difficulty: phase.difficulty,
    checkpoints: (phase.checkpoints ?? []).map((checkpoint) => projectRoadmapCheckpoint(checkpoint)),
  };
}

function projectRoadmapCheckpoint(checkpoint: ExternalPlanCheckpoint): RoadmapCheckpoint {
  return {
    id: sanitizeInlineText(checkpoint.id, "checkpoint"),
    title: sanitizeInlineText(checkpoint.title, "Untitled checkpoint"),
    goal: sanitizeOptionalText(checkpoint.goal),
    kind: sanitizeOptionalText(checkpoint.kind),
    difficulty: checkpoint.difficulty,
  };
}

function projectTasks(
  externalTasks: ExternalPlanTask[],
  phases: ExternalPlanPhase[],
  existingState: TrackStateFile | undefined,
  preserveProgress: boolean,
  taskIds: Set<string>
): Task[] {
  const existingTasks = new Map((existingState?.tasks ?? []).map((task) => [task.id, task]));
  const checkpointLapMap = new Map<string, string>();
  for (const phase of phases) {
    for (const checkpoint of phase.checkpoints ?? []) {
      checkpointLapMap.set(checkpoint.id, phase.id);
    }
  }

  return externalTasks.map((task) => {
    const existingTask = existingTasks.get(task.id);
    taskIds.add(task.id);
    return {
      id: sanitizeInlineText(task.id, "task"),
      title: sanitizeInlineText(task.title, "Untitled task"),
      checkpoint_id: sanitizeInlineText(task.checkpoint_id, "checkpoint"),
      lap_id: sanitizeInlineText(task.lap_id ?? checkpointLapMap.get(task.checkpoint_id), "lap"),
      owner: sanitizeOptionalText(task.owner ?? existingTask?.owner) ?? null,
      status: preserveProgress ? existingTask?.status ?? coerceStatus(task.status) : coerceStatus(task.status),
    };
  });
}

function projectLap(
  phase: ExternalPlanPhase,
  tasks: Task[],
  existingState: TrackStateFile | undefined,
  preserveProgress: boolean
): Lap {
  const existingLap = (existingState?.laps ?? []).find((lap) => lap.id === phase.id);
  const checkpoints = (phase.checkpoints ?? []).map((checkpoint) => {
    const existingCheckpoint = (existingLap?.checkpoints ?? []).find((entry) => entry.id === checkpoint.id);
    const mappedTasks = tasks.filter((task) => task.checkpoint_id === checkpoint.id);
    const status = preserveProgress
      ? existingCheckpoint?.status ?? deriveStatusFromTasks(mappedTasks, checkpoint.status)
      : deriveStatusFromTasks(mappedTasks, checkpoint.status);
    const projected: Checkpoint = {
      id: sanitizeInlineText(checkpoint.id, "checkpoint"),
      title: sanitizeInlineText(checkpoint.title, "Untitled checkpoint"),
      status,
      weight: typeof checkpoint.weight === "number" ? checkpoint.weight : 1,
    };
    return projected;
  });

  return {
    id: sanitizeInlineText(phase.id, "lap"),
    title: sanitizeInlineText(phase.title, "Untitled lap"),
    status: preserveProgress ? existingLap?.status ?? deriveStatusFromCheckpoints(checkpoints, phase.status) : deriveStatusFromCheckpoints(checkpoints, phase.status),
    checkpoints,
  };
}

function deriveStatusFromTasks(tasks: Task[], fallback?: TrackStatus): TrackStatus {
  if (tasks.some((task) => task.status === "blocked")) {
    return "blocked";
  }
  if (tasks.length > 0 && tasks.every((task) => task.status === "done")) {
    return "done";
  }
  if (tasks.some((task) => task.status === "doing")) {
    return "doing";
  }
  if (tasks.some((task) => task.status === "done")) {
    return "doing";
  }
  return coerceStatus(fallback);
}

function deriveStatusFromCheckpoints(checkpoints: Checkpoint[], fallback?: TrackStatus): TrackStatus {
  if (checkpoints.some((checkpoint) => checkpoint.status === "blocked")) {
    return "blocked";
  }
  if (checkpoints.length > 0 && checkpoints.every((checkpoint) => checkpoint.status === "done")) {
    return "done";
  }
  if (checkpoints.some((checkpoint) => checkpoint.status === "doing")) {
    return "doing";
  }
  if (checkpoints.some((checkpoint) => checkpoint.status === "done")) {
    return "doing";
  }
  return coerceStatus(fallback);
}

function deriveActiveLap(laps: Lap[]): number | undefined {
  if (!laps.length) {
    return undefined;
  }
  const activeIndex = laps.findIndex((lap) => lap.status === "blocked" || lap.status === "doing");
  if (activeIndex >= 0) {
    return activeIndex + 1;
  }
  const nextIndex = laps.findIndex((lap) => lap.status === "todo");
  if (nextIndex >= 0) {
    return nextIndex + 1;
  }
  return laps.length;
}

function deriveNextAction(tasks: Task[], laps: Lap[]): string {
  const blockedTask = tasks.find((task) => task.status === "blocked");
  if (blockedTask) {
    return sanitizeInlineText(`Resolve blocker on ${blockedTask.title}`, "Resolve blocker");
  }
  const doingTask = tasks.find((task) => task.status === "doing");
  if (doingTask) {
    return sanitizeInlineText(doingTask.title, doingTask.id);
  }
  const todoTask = tasks.find((task) => task.status === "todo");
  if (todoTask) {
    return sanitizeInlineText(todoTask.title, todoTask.id);
  }

  const checkpoint = laps.flatMap((lap) => lap.checkpoints ?? []).find((entry) => entry.status === "todo");
  return sanitizeInlineText(checkpoint?.title, "No next action recorded");
}

function computePercentFromCheckpoints(checkpoints: Checkpoint[]): number {
  if (!checkpoints.length) {
    return 0;
  }

  const totalWeight = checkpoints.reduce((sum, checkpoint) => sum + (checkpoint.weight ?? 1), 0);
  const doneWeight = checkpoints.reduce((sum, checkpoint) => {
    if (checkpoint.status === "done") {
      return sum + (checkpoint.weight ?? 1);
    }
    if (checkpoint.status === "doing" || checkpoint.status === "blocked") {
      return sum + (checkpoint.weight ?? 1) * 0.5;
    }
    return sum;
  }, 0);

  return clampPercent(Math.round((doneWeight / Math.max(totalWeight, 1)) * 100));
}

function preserveRelevantFlags(flags: Flag[], taskIds: Set<string>): Flag[] {
  return flags.filter((flag) => {
    if (flag.source === "track:auto-block") {
      const suffix = flag.id.replace(/^auto-block:/, "");
      return taskIds.has(suffix);
    }
    return true;
  });
}

function deriveBlockedReason(flags: Flag[]): string | null {
  return flags.find((flag) => flag.level === "red")?.detail ?? null;
}

function deriveHealth(flags: Flag[], blockedReason: string | null): TrackHealth {
  if (blockedReason || flags.some((flag) => flag.level === "red")) {
    return "red";
  }
  if (flags.some((flag) => flag.level === "yellow")) {
    return "yellow";
  }
  return "green";
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeOptionalText(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  const normalized = sanitizeInlineText(String(value), "");
  return normalized || undefined;
}

function coerceStatus(value: unknown): TrackStatus {
  return value === "done" || value === "doing" || value === "blocked" ? value : "todo";
}

function validateExternalPlan(value: unknown): asserts value is ExternalPlanFile {
  if (!value || typeof value !== "object") {
    throw new Error("External Track plan must be an object.");
  }

  const plan = value as Partial<ExternalPlanFile>;
  if (typeof plan.version !== "number") {
    throw new Error("External Track plan is missing numeric `version`.");
  }
  if (!plan.project?.id || !plan.project?.name) {
    throw new Error("External Track plan is missing `project.id` or `project.name`.");
  }
  if (!plan.plan || typeof plan.plan !== "object" || !Array.isArray(plan.plan.phases)) {
    throw new Error("External Track plan is missing `plan.phases`.");
  }
}
