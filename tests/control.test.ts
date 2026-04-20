import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";

import { buildTrackControlSnapshot, listTrackNextActions, listTrackTasks } from "../src/control.js";
import type { TrackStateFile } from "../src/types.js";

const EXAMPLE_PATH = path.resolve("examples", "track-state.example.yaml");

async function loadExampleState(): Promise<TrackStateFile> {
  const raw = await readFile(EXAMPLE_PATH, "utf8");
  return parse(raw) as TrackStateFile;
}

test("buildTrackControlSnapshot exposes active lap, checkpoint, tasks, and next actions", async () => {
  const state = await loadExampleState();
  const snapshot = buildTrackControlSnapshot(state);

  assert.equal(snapshot.activeLap?.id, "lap-2");
  assert.equal(snapshot.activeCheckpoint?.id, "cp-3");
  assert.equal(snapshot.tasks[0]?.id, "task-002");
  assert.equal(snapshot.tasks[0]?.isCurrent, true);
  assert.equal(snapshot.nextActions[0]?.kind, "continue_task");
  assert.match(snapshot.nextActions[0]?.title ?? "", /continue build terminal renderer/i);
});

test("listTrackTasks includes lap and checkpoint context", async () => {
  const state = await loadExampleState();
  const tasks = listTrackTasks(state);
  const currentTask = tasks.find((task) => task.id === "task-002");

  assert.equal(currentTask?.lapTitle, "CLI and MCP");
  assert.equal(currentTask?.checkpointTitle, "Text dashboard");
  assert.equal(currentTask?.owner, "codex");
});

test("listTrackNextActions prioritizes blockers over todo work", async () => {
  const state = await loadExampleState();
  const task = state.tasks?.find((entry) => entry.id === "task-003");
  if (!task) {
    throw new Error("Expected task-003 in example state.");
  }
  task.status = "blocked";

  const actions = listTrackNextActions(state);
  assert.equal(actions[0]?.kind, "resolve_blocker");
  assert.match(actions[0]?.title ?? "", /resolve blocker/i);
  assert.equal(actions[0]?.taskId, "task-003");
});
