import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCheckpoint,
  applyEventToState,
  blockTask,
  completeTask,
  startTask,
  unblockTask,
} from "../src/mutation.js";
import { summarizeTrack } from "../src/summary.js";
import type { TrackStateFile } from "../src/types.js";

function createMutationFixture(): TrackStateFile {
  return {
    version: 1,
    project: {
      id: "track",
      name: "Track",
      mode: "sprint",
    },
    track: {
      id: "track-v2",
      title: "Track plugin v2",
      topology: "sprint",
      total_laps: 1,
      active_lap: 1,
      health: "yellow",
      next_action: "Define MCP tools",
      blocked_reason: null,
      percent_complete: 67,
    },
    laps: [
      {
        id: "lap-1",
        title: "Core schema and CLI",
        status: "doing",
        checkpoints: [
          { id: "cp-1", title: "State loader", status: "done", weight: 2 },
          { id: "cp-2", title: "CLI status and next", status: "done", weight: 2 },
          { id: "cp-3", title: "MCP contract", status: "todo", weight: 3 },
        ],
      },
    ],
    tasks: [
      { id: "task-001", title: "Scaffold core package", checkpoint_id: "cp-1", status: "done", owner: "codex" },
      { id: "task-002", title: "Add status summary renderer", checkpoint_id: "cp-2", status: "done", owner: "codex" },
      { id: "task-003", title: "Define MCP tools", checkpoint_id: "cp-3", status: "todo", owner: "codex" },
    ],
    flags: [],
    events: [],
  };
}

test("startTask marks the task and checkpoint as doing", () => {
  const state = createMutationFixture();
  const result = startTask(state, "task-003", "test");

  const task = result.state.tasks?.find((entry) => entry.id === "task-003");
  const checkpoint = result.state.laps?.flatMap((lap) => lap.checkpoints ?? []).find((entry) => entry.id === "cp-3");

  assert.equal(task?.status, "doing");
  assert.equal(checkpoint?.status, "doing");
  assert.equal(result.state.track.next_action, "Define MCP tools");
});

test("blockTask raises red health and blocked reason", () => {
  const state = createMutationFixture();
  const result = blockTask(state, "task-003", "waiting on tool contract", "test");
  const summary = summarizeTrack(result.state);

  assert.equal(summary.health, "red");
  assert.equal(summary.blockedReason, "waiting on tool contract");
  assert.match(result.event.summary, /Blocked Define MCP tools/);
});

test("unblockTask clears auto block flags and resumes progress", () => {
  const state = createMutationFixture();
  const blocked = blockTask(state, "task-003", "waiting on tool contract", "test");
  const unblocked = unblockTask(blocked.state, "task-003", "test");
  const summary = summarizeTrack(unblocked.state);

  assert.equal(summary.blockedReason, null);
  assert.equal(unblocked.state.tasks?.find((entry) => entry.id === "task-003")?.status, "doing");
});

test("completeTask and advanceCheckpoint move the track forward", () => {
  const state = createMutationFixture();
  const started = startTask(state, "task-003", "test");
  const completed = completeTask(started.state, "task-003", "test");
  const advanced = advanceCheckpoint(completed.state, "cp-3", "test");
  const summary = summarizeTrack(advanced.state);
  const nextLapIndex =
    advanced.state.laps?.findIndex((lap) => lap.status === "doing" || lap.status === "blocked" || lap.status === "todo") ?? -1;
  const expectedActiveLap = nextLapIndex >= 0 ? nextLapIndex + 1 : advanced.state.laps?.length;
  const expectedCheckpointTitle =
    advanced.state.laps
      ?.flatMap((lap) => lap.checkpoints ?? [])
      .find((checkpoint) => checkpoint.status === "doing" || checkpoint.status === "blocked" || checkpoint.status === "todo")
      ?.title ?? "No active checkpoint";

  assert.equal(advanced.state.laps?.[0]?.checkpoints?.[2]?.status, "done");
  assert.equal(advanced.state.track.active_lap, expectedActiveLap);
  assert.equal(summary.activeCheckpointTitle, expectedCheckpointTitle);
});

test("applyEventToState appends the event to the in-memory state", () => {
  const state = createMutationFixture();
  const result = startTask(state, "task-003", "test");
  const next = applyEventToState(result.state, result.event);

  assert.equal(next.events?.at(-1)?.id, result.event.id);
});
