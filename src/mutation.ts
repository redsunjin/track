import type {
  Checkpoint,
  Flag,
  Lap,
  MutationResult,
  Task,
  TrackEvent,
  TrackStateFile,
  TrackStatus,
} from "./types.js";
import { sanitizeInlineText } from "./security.js";

const AUTO_BLOCK_SOURCE = "track:auto-block";

export function startTask(state: TrackStateFile, taskId: string, actor = "track"): MutationResult {
  const next = cloneState(state);
  const task = requireTask(next, taskId);
  task.status = "doing";
  clearAutoBlockFlag(next, taskId);
  normalizeState(next);
  return {
    state: next,
    event: createEvent("task.started", actor, `Started ${sanitizeInlineText(task.title, task.id)}`),
  };
}

export function completeTask(state: TrackStateFile, taskId: string, actor = "track"): MutationResult {
  const next = cloneState(state);
  const task = requireTask(next, taskId);
  task.status = "done";
  clearAutoBlockFlag(next, taskId);
  normalizeState(next);
  return {
    state: next,
    event: createEvent("task.completed", actor, `Completed ${sanitizeInlineText(task.title, task.id)}`),
  };
}

export function blockTask(
  state: TrackStateFile,
  taskId: string,
  reason: string,
  actor = "track"
): MutationResult {
  const next = cloneState(state);
  const task = requireTask(next, taskId);
  const normalizedReason = sanitizeInlineText(reason, "Blocked");
  task.status = "blocked";
  upsertAutoBlockFlag(next, taskId, task.title, normalizedReason);
  normalizeState(next);
  return {
    state: next,
    event: createEvent(
      "task.blocked",
      actor,
      `Blocked ${sanitizeInlineText(task.title, task.id)}: ${normalizedReason}`
    ),
  };
}

export function unblockTask(state: TrackStateFile, taskId: string, actor = "track"): MutationResult {
  const next = cloneState(state);
  const task = requireTask(next, taskId);
  task.status = "doing";
  clearAutoBlockFlag(next, taskId);
  normalizeState(next);
  return {
    state: next,
    event: createEvent("task.unblocked", actor, `Unblocked ${sanitizeInlineText(task.title, task.id)}`),
  };
}

export function advanceCheckpoint(
  state: TrackStateFile,
  checkpointId?: string,
  actor = "track"
): MutationResult {
  const next = cloneState(state);
  const checkpoint = checkpointId ? findCheckpoint(next, checkpointId) : findActiveOrNextCheckpoint(next);
  if (!checkpoint) {
    throw new Error("No checkpoint available to advance.");
  }

  checkpoint.status = "done";
  for (const task of next.tasks ?? []) {
    if (task.checkpoint_id === checkpoint.id && task.status !== "done") {
      task.status = "done";
      clearAutoBlockFlag(next, task.id);
    }
  }

  normalizeState(next);
  return {
    state: next,
    event: createEvent(
      "checkpoint.advanced",
      actor,
      `Advanced checkpoint ${sanitizeInlineText(checkpoint.title, checkpoint.id)}`
    ),
  };
}

export function applyEventToState(state: TrackStateFile, event: TrackEvent): TrackStateFile {
  const next = cloneState(state);
  next.events = [...(next.events ?? []), event];
  return next;
}

function normalizeState(state: TrackStateFile): void {
  normalizeCheckpointStatuses(state);
  normalizeLapStatuses(state);
  state.track.active_lap = deriveActiveLap(state.laps ?? []);
  state.track.percent_complete = computePercentFromCheckpoints(state);
  state.track.blocked_reason = deriveBlockedReason(state.flags ?? []);
  state.track.health = deriveHealth(state.flags ?? [], state.track.blocked_reason);
  state.track.next_action = deriveNextAction(state);
}

function normalizeCheckpointStatuses(state: TrackStateFile): void {
  const tasksByCheckpoint = new Map<string, Task[]>();
  for (const task of state.tasks ?? []) {
    if (!task.checkpoint_id) {
      continue;
    }
    const bucket = tasksByCheckpoint.get(task.checkpoint_id) ?? [];
    bucket.push(task);
    tasksByCheckpoint.set(task.checkpoint_id, bucket);
  }

  for (const lap of state.laps ?? []) {
    for (const checkpoint of lap.checkpoints ?? []) {
      const tasks = tasksByCheckpoint.get(checkpoint.id);
      if (tasks?.length) {
        checkpoint.status = deriveStatusFromTasks(tasks);
      }
    }
  }
}

function normalizeLapStatuses(state: TrackStateFile): void {
  for (const lap of state.laps ?? []) {
    const checkpoints = lap.checkpoints ?? [];
    if (!checkpoints.length) {
      continue;
    }
    lap.status = deriveStatusFromCheckpoints(checkpoints);
  }
}

function deriveStatusFromTasks(tasks: Task[]): TrackStatus {
  if (tasks.some((task) => task.status === "blocked")) {
    return "blocked";
  }
  if (tasks.every((task) => task.status === "done")) {
    return "done";
  }
  if (tasks.some((task) => task.status === "doing")) {
    return "doing";
  }
  if (tasks.some((task) => task.status === "done")) {
    return "doing";
  }
  return "todo";
}

function deriveStatusFromCheckpoints(checkpoints: Checkpoint[]): TrackStatus {
  if (checkpoints.some((checkpoint) => checkpoint.status === "blocked")) {
    return "blocked";
  }
  if (checkpoints.every((checkpoint) => checkpoint.status === "done")) {
    return "done";
  }
  if (checkpoints.some((checkpoint) => checkpoint.status === "doing")) {
    return "doing";
  }
  if (checkpoints.some((checkpoint) => checkpoint.status === "done")) {
    return "doing";
  }
  return "todo";
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

function deriveNextAction(state: TrackStateFile): string {
  const blockedTask = (state.tasks ?? []).find((task) => task.status === "blocked");
  if (blockedTask) {
    return sanitizeInlineText(`Resolve blocker on ${blockedTask.title}`, "Resolve blocker");
  }
  const doingTask = (state.tasks ?? []).find((task) => task.status === "doing");
  if (doingTask) {
    return sanitizeInlineText(doingTask.title, doingTask.id);
  }
  const nextTask = (state.tasks ?? []).find((task) => task.status === "todo");
  if (nextTask) {
    return sanitizeInlineText(nextTask.title, nextTask.id);
  }
  const nextCheckpoint = findActiveOrNextCheckpoint(state);
  return sanitizeInlineText(nextCheckpoint?.title, "No next action recorded");
}

function deriveBlockedReason(flags: Flag[]): string | null {
  const autoBlock = flags.find((flag) => flag.source === AUTO_BLOCK_SOURCE);
  const detail = autoBlock?.detail ?? flags.find((flag) => flag.level === "red")?.detail ?? null;
  return detail ? sanitizeInlineText(detail) : null;
}

function deriveHealth(flags: Flag[], blockedReason: string | null): "green" | "yellow" | "red" {
  if (blockedReason || flags.some((flag) => flag.level === "red")) {
    return "red";
  }
  if (flags.some((flag) => flag.level === "yellow")) {
    return "yellow";
  }
  return "green";
}

function computePercentFromCheckpoints(state: TrackStateFile): number {
  const checkpoints = (state.laps ?? []).flatMap((lap) => lap.checkpoints ?? []);
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
  return Math.max(0, Math.min(100, Math.round((doneWeight / Math.max(totalWeight, 1)) * 100)));
}

function findCheckpoint(state: TrackStateFile, checkpointId: string): Checkpoint | undefined {
  for (const lap of state.laps ?? []) {
    for (const checkpoint of lap.checkpoints ?? []) {
      if (checkpoint.id === checkpointId) {
        return checkpoint;
      }
    }
  }
  return undefined;
}

function findActiveOrNextCheckpoint(state: TrackStateFile): Checkpoint | undefined {
  const checkpoints = (state.laps ?? []).flatMap((lap) => lap.checkpoints ?? []);
  return (
    checkpoints.find((checkpoint) => checkpoint.status === "blocked" || checkpoint.status === "doing") ??
    checkpoints.find((checkpoint) => checkpoint.status === "todo")
  );
}

function requireTask(state: TrackStateFile, taskId: string): Task {
  const task = (state.tasks ?? []).find((entry) => entry.id === taskId);
  if (!task) {
    throw new Error(`Unknown task: ${taskId}`);
  }
  return task;
}

function upsertAutoBlockFlag(state: TrackStateFile, taskId: string, taskTitle: string, reason: string): void {
  const flags = state.flags ?? [];
  const id = autoBlockFlagId(taskId);
  const normalizedTitle = sanitizeInlineText(taskTitle, taskId);
  const existing = flags.find((flag) => flag.id === id);
  if (existing) {
    existing.level = "red";
    existing.title = `Blocked ${normalizedTitle}`;
    existing.detail = reason;
    existing.source = AUTO_BLOCK_SOURCE;
  } else {
    flags.push({
      id,
      level: "red",
      title: `Blocked ${normalizedTitle}`,
      detail: reason,
      source: AUTO_BLOCK_SOURCE,
    });
  }
  state.flags = flags;
}

function clearAutoBlockFlag(state: TrackStateFile, taskId: string): void {
  state.flags = (state.flags ?? []).filter((flag) => flag.id !== autoBlockFlagId(taskId));
}

function autoBlockFlagId(taskId: string): string {
  return `auto-block:${taskId}`;
}

function createEvent(type: string, actor: string, summary: string): TrackEvent {
  const timestamp = new Date().toISOString();
  return {
    id: `evt-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    actor,
    timestamp,
    summary,
  };
}

function cloneState<T>(value: T): T {
  return structuredClone(value);
}
