import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";

import { importExternalPlan, loadExternalPlan, projectExternalPlan, summarizeExternalPlanImport } from "../src/external-plan.js";
import { loadTrackState } from "../src/state.js";

const EXTERNAL_PLAN_PATH = path.resolve("examples", "external-plan.example.yaml");
const EXAMPLE_STATE_PATH = path.resolve("examples", "track-state.example.yaml");

test("projectExternalPlan creates roadmap and state from an external plan", async () => {
  const externalPlan = await loadExternalPlan(path.resolve("."), EXTERNAL_PLAN_PATH);
  const projected = projectExternalPlan(externalPlan, { preserveProgress: false });

  assert.equal(projected.roadmap.project.name, "Track");
  assert.equal(projected.roadmap.roadmap.phases.length, 1);
  assert.equal(projected.state.track.title, "Track plugin v2");
  assert.equal(projected.state.track.active_lap, 1);
  assert.equal(projected.state.track.next_action, "Build generic plan import adapter");
  assert.equal(projected.state.tasks?.length, 2);
  assert.equal(projected.state.laps?.[0]?.checkpoints?.[0]?.status, "doing");
  assert.match(summarizeExternalPlanImport(projected), /Projected 1 phases, 2 checkpoints, and 2 tasks/);
});

test("projectExternalPlan preserves matching task progress from the existing Track state", async () => {
  const externalPlan = await loadExternalPlan(path.resolve("."), EXTERNAL_PLAN_PATH);
  const existingState = await loadTrackState(path.resolve("."), ".track/state.yaml");
  const projected = projectExternalPlan(externalPlan, {
    existingState: {
      ...existingState,
      tasks: [
        {
          id: "task-007",
          title: "Build generic plan import adapter",
          checkpoint_id: "cp-7",
          status: "done",
          owner: "codex",
        },
      ],
      events: [],
      flags: [],
      laps: [],
    },
    preserveProgress: true,
  });

  assert.equal(projected.state.tasks?.find((task) => task.id === "task-007")?.status, "done");
  assert.equal(projected.state.laps?.[0]?.checkpoints?.[0]?.status, "done");
});

test("importExternalPlan writes projected roadmap and state files", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-import-"));
  const trackDir = path.join(tempDir, ".track");
  const externalRaw = await readFile(EXTERNAL_PLAN_PATH, "utf8");
  const existingStateRaw = await readFile(EXAMPLE_STATE_PATH, "utf8");

  await mkdir(trackDir, { recursive: true });
  await writeFile(path.join(tempDir, "plan.yaml"), externalRaw, "utf8");
  await writeFile(path.join(trackDir, "state.yaml"), existingStateRaw, "utf8");

  const existingState = await loadTrackState(tempDir);
  await importExternalPlan({
    cwd: tempDir,
    existingState,
    preserveProgress: true,
    sourceFile: "plan.yaml",
  });

  const savedRoadmap = parse(await readFile(path.join(trackDir, "roadmap.yaml"), "utf8")) as {
    roadmap: { phases: Array<{ id: string }> };
  };
  const savedState = parse(await readFile(path.join(trackDir, "state.yaml"), "utf8")) as {
    track: { next_action: string };
    tasks: Array<{ id: string; status: string }>;
  };

  assert.equal(savedRoadmap.roadmap.phases[0]?.id, "phase-5");
  assert.equal(savedState.track.next_action, "Build generic plan import adapter");
  assert.equal(savedState.tasks.find((task) => task.id === "task-007")?.status, "doing");
});
