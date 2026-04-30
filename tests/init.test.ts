import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initTrack, planTrackInit, projectTrackInit, renderTrackInitPlan } from "../src/init.js";
import { loadTrackRoadmap } from "../src/roadmap.js";
import { loadTrackState } from "../src/state.js";

test("projectTrackInit creates minimal simple roadmap and state objects", () => {
  const result = projectTrackInit({ projectName: "My New App" });

  assert.equal(result.roadmap.project.id, "my-new-app");
  assert.equal(result.roadmap.project.name, "My New App");
  assert.equal(result.roadmap.roadmap.phases.length, 1);
  assert.equal(result.roadmap.roadmap.phases[0]?.checkpoints?.length, 3);
  assert.equal(result.state.track.title, "My New App roadmap");
  assert.equal(result.state.track.active_lap, 1);
  assert.equal(result.state.track.percent_complete, 0);
  assert.equal(result.state.laps?.[0]?.status, "doing");
  assert.equal(result.state.laps?.[0]?.checkpoints?.[0]?.status, "doing");
  assert.equal(result.state.laps?.[0]?.checkpoints?.[1]?.status, "todo");
  assert.equal(result.state.laps?.[0]?.checkpoints?.[2]?.status, "todo");
  assert.equal(result.state.tasks?.[0]?.status, "doing");
  assert.equal(result.state.tasks?.[0]?.title, result.state.track.next_action);
});

test("planTrackInit supports dry-run style file planning without writing files", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-init-plan-"));
  const plan = await planTrackInit({ cwd: tempDir, dryRun: true, projectName: "Planning Only" });

  assert.equal(plan.ok, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.files.roadmap.action, "create");
  assert.equal(plan.files.state.action, "create");
  assert.equal(plan.writes.length, 2);
  assert.match(renderTrackInitPlan(plan), /TRACK INIT DRY RUN/);
  await assert.rejects(() => readFile(path.join(tempDir, ".track", "roadmap.yaml"), "utf8"));
  await assert.rejects(() => readFile(path.join(tempDir, ".track", "state.yaml"), "utf8"));
});

test("initTrack writes simple roadmap and state files with existing save helpers", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-init-write-"));
  const result = await initTrack({ cwd: tempDir, projectName: "Writable Project" });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.written.map((file) => file.kind),
    ["roadmap", "state"]
  );

  const roadmap = await loadTrackRoadmap(tempDir);
  const state = await loadTrackState(tempDir);

  assert.equal(roadmap.project.name, "Writable Project");
  assert.equal(roadmap.roadmap.phases[0]?.id, "phase-1");
  assert.equal(state.project.id, "writable-project");
  assert.equal(state.tasks?.[0]?.checkpoint_id, "cp-1");
});

test("initTrack refuses to overwrite existing files without force", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-init-conflict-"));
  const trackDir = path.join(tempDir, ".track");
  const roadmapPath = path.join(trackDir, "roadmap.yaml");
  const statePath = path.join(trackDir, "state.yaml");

  await mkdir(trackDir, { recursive: true });
  await writeFile(roadmapPath, "existing roadmap\n", "utf8");
  await writeFile(statePath, "existing state\n", "utf8");

  const plan = await planTrackInit({ cwd: tempDir, projectName: "Conflict Project" });
  assert.equal(plan.ok, false);
  assert.deepEqual(
    plan.conflicts.map((file) => file.kind),
    ["roadmap", "state"]
  );
  assert.match(renderTrackInitPlan(plan), /TRACK INIT BLOCKED/);

  await assert.rejects(() => initTrack({ cwd: tempDir, projectName: "Conflict Project" }), /would overwrite/);
  assert.equal(await readFile(roadmapPath, "utf8"), "existing roadmap\n");
  assert.equal(await readFile(statePath, "utf8"), "existing state\n");
});

test("force marks existing files as overwrites and replaces them", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-init-force-"));
  const trackDir = path.join(tempDir, ".track");

  await mkdir(trackDir, { recursive: true });
  await writeFile(path.join(trackDir, "roadmap.yaml"), "existing roadmap\n", "utf8");
  await writeFile(path.join(trackDir, "state.yaml"), "existing state\n", "utf8");

  const plan = await planTrackInit({ cwd: tempDir, force: true, projectName: "Forced Project" });
  assert.equal(plan.ok, true);
  assert.deepEqual(
    plan.writes.map((file) => file.action),
    ["overwrite", "overwrite"]
  );

  const result = await initTrack({ cwd: tempDir, force: true, projectName: "Forced Project" });
  assert.deepEqual(
    result.written.map((file) => file.action),
    ["overwrite", "overwrite"]
  );

  const state = await loadTrackState(tempDir);
  assert.equal(state.project.name, "Forced Project");
});

test("planTrackInit rejects unknown templates", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-init-template-"));

  await assert.rejects(() => planTrackInit({ cwd: tempDir, template: "unknown" }), /Unknown Track init template/);
});
