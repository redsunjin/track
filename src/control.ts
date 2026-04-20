import { summarizeTrack } from "./summary.js";
import type {
  Checkpoint,
  Lap,
  Task,
  TrackControlSnapshot,
  TrackNextActionItem,
  TrackStateFile,
  TrackTaskView,
} from "./types.js";

export function buildTrackControlSnapshot(state: TrackStateFile): TrackControlSnapshot {
  const summary = summarizeTrack(state);
  const laps = state.laps ?? [];
  const tasks = state.tasks ?? [];
  const flags = state.flags ?? [];
  const activeLap = findActiveLap(laps, state.track.active_lap);
  const activeCheckpoint = findActiveCheckpoint(laps);
  const taskViews = buildTrackTaskViews(tasks, laps, activeCheckpoint?.id);
  const nextActions = buildTrackNextActions(taskViews, activeCheckpoint, summary.nextAction);

  return {
    summary,
    activeLap: activeLap
      ? {
          id: activeLap.id,
          title: activeLap.title,
          status: activeLap.status,
          index: laps.indexOf(activeLap) + 1,
          total: laps.length,
        }
      : null,
    activeCheckpoint: activeCheckpoint
      ? {
          id: activeCheckpoint.id,
          title: activeCheckpoint.title,
          status: activeCheckpoint.status,
          lapId: resolveLapForCheckpoint(laps, activeCheckpoint.id)?.id ?? null,
          lapTitle: resolveLapForCheckpoint(laps, activeCheckpoint.id)?.title ?? null,
        }
      : null,
    tasks: taskViews,
    nextActions,
    flags,
    recentEvents: summary.recentEvents,
  };
}

export function listTrackTasks(state: TrackStateFile): TrackTaskView[] {
  return buildTrackControlSnapshot(state).tasks;
}

export function listTrackNextActions(state: TrackStateFile): TrackNextActionItem[] {
  return buildTrackControlSnapshot(state).nextActions;
}

function buildTrackTaskViews(tasks: Task[], laps: Lap[], activeCheckpointId?: string): TrackTaskView[] {
  const tasksWithIndex = tasks.map((task, index) => ({ task, index }));
  tasksWithIndex.sort((left, right) => compareTasks(left.task, right.task, left.index, right.index, laps));
  return tasksWithIndex.map(({ task }) => {
    const lap = task.lap_id ? laps.find((candidate) => candidate.id === task.lap_id) : resolveLapForCheckpoint(laps, task.checkpoint_id);
    const checkpoint = resolveCheckpoint(laps, task.checkpoint_id);
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      owner: task.owner ?? null,
      lapId: lap?.id ?? null,
      lapTitle: lap?.title ?? null,
      checkpointId: checkpoint?.id ?? null,
      checkpointTitle: checkpoint?.title ?? null,
      blockedReason: task.status === "blocked" ? `Resolve blocker on ${task.title}` : null,
      isCurrent:
        task.status === "doing" ||
        task.status === "blocked" ||
        (task.status === "todo" && activeCheckpointId != null && task.checkpoint_id === activeCheckpointId),
    };
  });
}

function buildTrackNextActions(
  tasks: TrackTaskView[],
  activeCheckpoint: Checkpoint | undefined,
  fallbackSummaryAction: string
): TrackNextActionItem[] {
  const blockedTasks = tasks.filter((task) => task.status === "blocked");
  if (blockedTasks.length) {
    return blockedTasks.map((task) => ({
      id: `resolve-${task.id}`,
      kind: "resolve_blocker",
      title: `Resolve blocker on ${task.title}`,
      detail: task.blockedReason,
      taskId: task.id,
      checkpointId: task.checkpointId,
      owner: task.owner,
      priority: "red",
    }));
  }

  const doingTasks = tasks.filter((task) => task.status === "doing");
  if (doingTasks.length) {
    return doingTasks.map((task) => ({
      id: `continue-${task.id}`,
      kind: "continue_task",
      title: `Continue ${task.title}`,
      detail: task.checkpointTitle,
      taskId: task.id,
      checkpointId: task.checkpointId,
      owner: task.owner,
      priority: "green",
    }));
  }

  const queuedTask =
    tasks.find((task) => task.status === "todo" && task.isCurrent) ??
    tasks.find((task) => task.status === "todo");
  if (queuedTask) {
    return [
      {
        id: `start-${queuedTask.id}`,
        kind: "start_task",
        title: `Start ${queuedTask.title}`,
        detail: queuedTask.checkpointTitle,
        taskId: queuedTask.id,
        checkpointId: queuedTask.checkpointId,
        owner: queuedTask.owner,
        priority: "green",
      },
    ];
  }

  if (activeCheckpoint && activeCheckpoint.status !== "done") {
    return [
      {
        id: `advance-${activeCheckpoint.id}`,
        kind: "advance_checkpoint",
        title: `Advance checkpoint ${activeCheckpoint.title}`,
        detail: null,
        taskId: null,
        checkpointId: activeCheckpoint.id,
        owner: null,
        priority: "yellow",
      },
    ];
  }

  return [
    {
      id: "plan-next-slice",
      kind: "plan_next_slice",
      title: fallbackSummaryAction,
      detail: null,
      taskId: null,
      checkpointId: null,
      owner: null,
      priority: "yellow",
    },
  ];
}

function findActiveLap(laps: Lap[], activeLapIndex?: number): Lap | undefined {
  if (typeof activeLapIndex === "number" && activeLapIndex >= 1 && activeLapIndex <= laps.length) {
    return laps[activeLapIndex - 1];
  }
  return laps.find((lap) => lap.status === "blocked" || lap.status === "doing") ?? laps.find((lap) => lap.status === "todo");
}

function findActiveCheckpoint(laps: Lap[]): Checkpoint | undefined {
  const checkpoints = laps.flatMap((lap) => lap.checkpoints ?? []);
  return (
    checkpoints.find((checkpoint) => checkpoint.status === "blocked" || checkpoint.status === "doing") ??
    checkpoints.find((checkpoint) => checkpoint.status === "todo")
  );
}

function resolveLapForCheckpoint(laps: Lap[], checkpointId?: string): Lap | undefined {
  if (!checkpointId) {
    return undefined;
  }
  return laps.find((lap) => (lap.checkpoints ?? []).some((checkpoint) => checkpoint.id === checkpointId));
}

function resolveCheckpoint(laps: Lap[], checkpointId?: string): Checkpoint | undefined {
  if (!checkpointId) {
    return undefined;
  }
  for (const lap of laps) {
    const checkpoint = (lap.checkpoints ?? []).find((candidate) => candidate.id === checkpointId);
    if (checkpoint) {
      return checkpoint;
    }
  }
  return undefined;
}

function compareTasks(left: Task, right: Task, leftIndex: number, rightIndex: number, laps: Lap[]): number {
  const leftRank = taskStatusRank(left.status);
  const rightRank = taskStatusRank(right.status);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftLapIndex = resolveLapIndex(left, laps);
  const rightLapIndex = resolveLapIndex(right, laps);
  if (leftLapIndex !== rightLapIndex) {
    return leftLapIndex - rightLapIndex;
  }

  const leftCheckpointIndex = resolveCheckpointIndex(left, laps);
  const rightCheckpointIndex = resolveCheckpointIndex(right, laps);
  if (leftCheckpointIndex !== rightCheckpointIndex) {
    return leftCheckpointIndex - rightCheckpointIndex;
  }

  return leftIndex - rightIndex;
}

function taskStatusRank(status: Task["status"]): number {
  switch (status) {
    case "blocked":
      return 0;
    case "doing":
      return 1;
    case "todo":
      return 2;
    case "done":
      return 3;
    default:
      return 4;
  }
}

function resolveLapIndex(task: Task, laps: Lap[]): number {
  if (task.lap_id) {
    const index = laps.findIndex((lap) => lap.id === task.lap_id);
    if (index >= 0) {
      return index;
    }
  }
  const checkpointLap = resolveLapForCheckpoint(laps, task.checkpoint_id);
  return checkpointLap ? laps.indexOf(checkpointLap) : Number.MAX_SAFE_INTEGER;
}

function resolveCheckpointIndex(task: Task, laps: Lap[]): number {
  if (!task.checkpoint_id) {
    return Number.MAX_SAFE_INTEGER;
  }
  const lap = resolveLapForCheckpoint(laps, task.checkpoint_id);
  if (!lap) {
    return Number.MAX_SAFE_INTEGER;
  }
  const checkpoints = lap.checkpoints ?? [];
  const index = checkpoints.findIndex((checkpoint) => checkpoint.id === task.checkpoint_id);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}
