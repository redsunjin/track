import {
  advanceCheckpoint,
  applyEventToState,
  blockTask,
  completeTask,
  startTask,
  unblockTask,
} from "./mutation.js";
import {
  appendTrackEventLog,
  loadTrackStateFromPath,
  resolveStatePath,
  saveTrackState,
  withTrackStateLock,
} from "./state.js";
import { summarizeTrack } from "./summary.js";
import type { TrackEvent, TrackStateFile, TrackSummary } from "./types.js";

export type TrackMutationCommand =
  | "start"
  | "done"
  | "block"
  | "unblock"
  | "checkpoint-advance";

export interface ApplyTrackMutationOptions {
  actor?: string;
  checkpointId?: string;
  command: TrackMutationCommand;
  reason?: string;
  repoRoot: string;
  stateFile?: string;
  taskId?: string;
}

export interface ApplyTrackMutationResult {
  event: TrackEvent;
  repoPath: string;
  state: TrackStateFile;
  stateFilePath: string;
  summary: TrackSummary;
}

export async function applyTrackMutation(options: ApplyTrackMutationOptions): Promise<ApplyTrackMutationResult> {
  const actor = options.actor ?? "track";
  const stateFilePath = await resolveStatePath(options.repoRoot, options.stateFile);
  return withTrackStateLock(stateFilePath, async () => {
    const state = await loadTrackStateFromPath(stateFilePath);
    const mutation =
      options.command === "start"
        ? startTask(state, requireTaskId(options.taskId, options.command), actor)
        : options.command === "done"
          ? completeTask(state, requireTaskId(options.taskId, options.command), actor)
          : options.command === "block"
            ? blockTask(state, requireTaskId(options.taskId, options.command), requireReason(options.reason), actor)
            : options.command === "unblock"
              ? unblockTask(state, requireTaskId(options.taskId, options.command), actor)
              : advanceCheckpoint(state, options.checkpointId, actor);

    const stateWithEvent = applyEventToState(mutation.state, mutation.event);
    await saveTrackState(stateFilePath, stateWithEvent);
    await appendTrackEventLog(stateFilePath, mutation.event);

    return {
      event: mutation.event,
      repoPath: options.repoRoot,
      state: stateWithEvent,
      stateFilePath,
      summary: summarizeTrack(stateWithEvent),
    };
  });
}

function requireTaskId(taskId: string | undefined, command: TrackMutationCommand): string {
  if (!taskId) {
    throw new Error(`Command \`${command}\` requires a task id.`);
  }
  return taskId;
}

function requireReason(reason: string | undefined): string {
  if (!reason) {
    throw new Error("Command `block` requires a reason.");
  }
  return reason;
}
