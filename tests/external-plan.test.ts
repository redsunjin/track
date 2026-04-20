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
const NOTION_PLAN_PATH = path.resolve("examples", "notion-roadmap.example.json");

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

test("loadExternalPlan bridges the intermediate adapter schema into the external plan projection", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-external-plan-bridge-"));
  const planPath = path.join(tempDir, "adapter-plan.json");

  await writeFile(
    planPath,
    JSON.stringify(
      {
        version: 1,
        project: {
          id: "adapter-demo",
          name: "Adapter Demo",
          mode: "sprint",
        },
        phases: [
          {
            id: "phase-1",
            title: "Phase 1",
            checkpoints: [
              {
                id: "cp-1",
                title: "Checkpoint 1",
                status: "doing",
                weight: 2,
              },
            ],
          },
        ],
        tasks: [
          {
            id: "task-1",
            title: "Task 1",
            phase_id: "phase-1",
            checkpoint_id: "cp-1",
            status: "doing",
            owner: "codex",
          },
        ],
        metadata: {
          kind: "fixture",
          name: "adapter-demo",
          plan_id: "adapter-demo-plan",
          plan_title: "Adapter Demo Plan",
          topology: "sprint",
        },
      },
      null,
      2
    ),
    "utf8"
  );

  const externalPlan = await loadExternalPlan(tempDir, "adapter-plan.json");

  assert.equal(externalPlan.project.id, "adapter-demo");
  assert.equal(externalPlan.plan.id, "adapter-demo-plan");
  assert.equal(externalPlan.plan.title, "Adapter Demo Plan");
  assert.equal(externalPlan.plan.phases[0]?.checkpoints?.[0]?.id, "cp-1");
  assert.equal(externalPlan.tasks?.[0]?.lap_id, "phase-1");
  assert.equal(externalPlan.source?.kind, "fixture");
});

test("loadExternalPlan can use the notion adapter entry point", async () => {
  const externalPlan = await loadExternalPlan(path.resolve("."), NOTION_PLAN_PATH, "notion");

  assert.equal(externalPlan.project.name, "Track");
  assert.equal(externalPlan.plan.phases[0]?.id, "phase-8");
  assert.equal(externalPlan.plan.phases[0]?.checkpoints?.[1]?.id, "cp-15");
  assert.equal(externalPlan.tasks?.[1]?.lap_id, "phase-8");
  assert.equal(externalPlan.source?.kind, "notion");
  assert.equal(externalPlan.source?.name, "Track Roadmap");
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

test("importExternalPlan accepts provider-specific adapter kinds", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-import-notion-"));
  const notionRaw = await readFile(NOTION_PLAN_PATH, "utf8");

  await writeFile(path.join(tempDir, "notion-roadmap.json"), notionRaw, "utf8");

  const result = await importExternalPlan({
    cwd: tempDir,
    adapterKind: "notion",
    preserveProgress: false,
    sourceFile: "notion-roadmap.json",
    dryRun: true,
  });

  assert.equal(result.roadmap.roadmap.phases[0]?.id, "phase-8");
  assert.equal(result.state.track.next_action, "Route file import through roadmap adapters");
  assert.equal(result.state.tasks?.find((task) => task.id === "task-017")?.status, "doing");
});
