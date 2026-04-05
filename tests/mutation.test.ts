import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  advanceCheckpoint,
  applyEventToState,
  blockTask,
  completeTask,
  startTask,
  unblockTask,
} from "../src/mutation.js";
import { loadTrackState } from "../src/state.js";
import { summarizeTrack } from "../src/summary.js";

test("startTask marks the task and checkpoint as doing", async () => {
  const root = path.resolve(".");
  const state = await loadTrackState(root, ".track/state.yaml");
  const result = startTask(state, "task-003", "test");

  const task = result.state.tasks?.find((entry) => entry.id === "task-003");
  const checkpoint = result.state.laps?.flatMap((lap) => lap.checkpoints ?? []).find((entry) => entry.id === "cp-3");

  assert.equal(task?.status, "doing");
  assert.equal(checkpoint?.status, "doing");
  assert.equal(result.state.track.next_action, "Define MCP tools");
});

test("blockTask raises red health and blocked reason", async () => {
  const root = path.resolve(".");
  const state = await loadTrackState(root, ".track/state.yaml");
  const result = blockTask(state, "task-003", "waiting on tool contract", "test");
  const summary = summarizeTrack(result.state);

  assert.equal(summary.health, "red");
  assert.equal(summary.blockedReason, "waiting on tool contract");
  assert.match(result.event.summary, /Blocked Define MCP tools/);
});

test("unblockTask clears auto block flags and resumes progress", async () => {
  const root = path.resolve(".");
  const state = await loadTrackState(root, ".track/state.yaml");
  const blocked = blockTask(state, "task-003", "waiting on tool contract", "test");
  const unblocked = unblockTask(blocked.state, "task-003", "test");
  const summary = summarizeTrack(unblocked.state);

  assert.equal(summary.blockedReason, null);
  assert.equal(unblocked.state.tasks?.find((entry) => entry.id === "task-003")?.status, "doing");
});

test("completeTask and advanceCheckpoint move the track forward", async () => {
  const root = path.resolve(".");
  const state = await loadTrackState(root, ".track/state.yaml");
  const started = startTask(state, "task-003", "test");
  const completed = completeTask(started.state, "task-003", "test");
  const advanced = advanceCheckpoint(completed.state, "cp-3", "test");
  const summary = summarizeTrack(advanced.state);

  assert.equal(advanced.state.laps?.[0]?.checkpoints?.[2]?.status, "done");
  assert.equal(advanced.state.track.active_lap, 4);
  assert.equal(summary.activeCheckpointTitle, "VS Code companion scaffold");
});

test("applyEventToState appends the event to the in-memory state", async () => {
  const root = path.resolve(".");
  const state = await loadTrackState(root, ".track/state.yaml");
  const result = startTask(state, "task-003", "test");
  const next = applyEventToState(result.state, result.event);

  assert.equal(next.events?.at(-1)?.id, result.event.id);
});
