import type {
  Checkpoint,
  Flag,
  Lap,
  Task,
  TrackHealth,
  TrackStateFile,
  TrackSummary,
} from "./types.js";

export function summarizeTrack(state: TrackStateFile): TrackSummary {
  const laps = state.laps ?? [];
  const tasks = state.tasks ?? [];
  const checkpoints = laps.flatMap((lap) => lap.checkpoints ?? []);
  const currentCheckpoint = findCurrentCheckpoint(laps);
  const percentComplete =
    typeof state.track.percent_complete === "number"
      ? clampPercent(state.track.percent_complete)
      : computePercentFromCheckpoints(checkpoints);
  const health = deriveHealth(state.track.health, state.flags ?? []);
  const currentOwner = findCurrentOwner(tasks, currentCheckpoint?.id);

  return {
    projectName: state.project.name,
    mode: state.project.mode ?? state.track.topology ?? "circuit",
    title: state.track.title,
    health,
    percentComplete,
    activeLapLabel: formatActiveLapLabel(laps, state.track.active_lap),
    activeCheckpointTitle: currentCheckpoint?.title ?? "No active checkpoint",
    nextAction:
      state.track.next_action?.trim() ||
      currentCheckpoint?.title ||
      findNextTask(tasks)?.title ||
      "No next action recorded",
    blockedReason: state.track.blocked_reason ?? findBlockedReason(state.flags ?? []),
    currentOwner,
    openFlags: (state.flags ?? []).filter((flag) => flag.level === "yellow" || flag.level === "red"),
    recentEvents: [...(state.events ?? [])].slice(-3).reverse(),
  };
}

function computePercentFromCheckpoints(checkpoints: Checkpoint[]): number {
  if (checkpoints.length === 0) {
    return 0;
  }

  const totalWeight = checkpoints.reduce((sum, checkpoint) => sum + (checkpoint.weight ?? 1), 0);
  const doneWeight = checkpoints.reduce((sum, checkpoint) => {
    if (checkpoint.status === "done") {
      return sum + (checkpoint.weight ?? 1);
    }
    if (checkpoint.status === "doing") {
      return sum + (checkpoint.weight ?? 1) * 0.5;
    }
    return sum;
  }, 0);

  return clampPercent(Math.round((doneWeight / Math.max(totalWeight, 1)) * 100));
}

function findCurrentCheckpoint(laps: Lap[]): Checkpoint | undefined {
  const all = laps.flatMap((lap) => lap.checkpoints ?? []);
  return (
    all.find((checkpoint) => checkpoint.status === "doing" || checkpoint.status === "blocked") ||
    all.find((checkpoint) => checkpoint.status === "todo")
  );
}

function findCurrentOwner(tasks: Task[], checkpointId?: string): string | null {
  if (checkpointId) {
    const activeTask = tasks.find(
      (task) => task.checkpoint_id === checkpointId && (task.status === "doing" || task.status === "blocked")
    );
    if (activeTask?.owner) {
      return activeTask.owner;
    }

    const queuedTask = tasks.find((task) => task.checkpoint_id === checkpointId && task.status === "todo");
    if (queuedTask?.owner) {
      return queuedTask.owner;
    }
  }

  const fallbackTask = tasks.find((task) => task.status === "doing" || task.status === "blocked");
  if (fallbackTask?.owner) {
    return fallbackTask.owner;
  }

  return tasks.find((task) => task.status === "todo")?.owner ?? null;
}

function findNextTask(tasks: Task[]): Task | undefined {
  return tasks.find((task) => task.status === "doing") ?? tasks.find((task) => task.status === "todo");
}

function findBlockedReason(flags: Flag[]): string | null {
  return flags.find((flag) => flag.level === "red")?.detail ?? null;
}

function deriveHealth(trackHealth: TrackHealth | undefined, flags: Flag[]): TrackHealth {
  if (trackHealth) {
    return trackHealth;
  }

  if (flags.some((flag) => flag.level === "red")) {
    return "red";
  }
  if (flags.some((flag) => flag.level === "yellow")) {
    return "yellow";
  }
  return "green";
}

function formatActiveLapLabel(laps: Lap[], activeLap?: number): string {
  if (!laps.length) {
    return "No laps defined";
  }

  const indexedLap =
    typeof activeLap === "number" && activeLap >= 1 && activeLap <= laps.length ? laps[activeLap - 1] : undefined;
  const activeLapEntity = indexedLap ?? laps.find((lap) => lap.status === "doing" || lap.status === "blocked") ?? laps[0];
  const lapNumber = laps.indexOf(activeLapEntity) + 1;
  return `${activeLapEntity.title} (${lapNumber}/${laps.length})`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
