import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { FileRoadmapAdapter } from "../src/adapters/file-adapter.js";

test("FileRoadmapAdapter maps the legacy external plan shape into the intermediate schema", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-adapter-legacy-"));
  const filePath = path.join(tempDir, "plan.yaml");
  await writeFile(
    filePath,
    `version: 1
project:
  id: track
  name: Track
  mode: sprint
plan:
  id: track-v2
  title: Track plugin v2
  topology: sprint
  phases:
    - id: phase-5
      title: External adapter core
      checkpoints:
        - id: cp-7
          title: Generic plan import adapter
          status: doing
tasks:
  - id: task-007
    title: Build generic plan import adapter
    checkpoint_id: cp-7
    status: doing
    owner: codex
`,
    "utf8"
  );

  const adapter = new FileRoadmapAdapter(filePath);
  await adapter.fetch();
  const schema = await adapter.toInternalSchema();

  assert.equal(schema.project.name, "Track");
  assert.equal(schema.phases[0]?.id, "phase-5");
  assert.equal(schema.phases[0]?.checkpoints?.[0]?.status, "doing");
  assert.equal(schema.tasks?.[0]?.checkpoint_id, "cp-7");
  assert.equal(schema.tasks?.[0]?.phase_id, "phase-5");
  assert.equal(schema.metadata?.plan_title, "Track plugin v2");
});

test("FileRoadmapAdapter accepts the direct intermediate schema shape", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-adapter-intermediate-"));
  const filePath = path.join(tempDir, "plan.json");
  await writeFile(
    filePath,
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
                status: "todo",
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
            status: "todo",
          },
        ],
        metadata: {
          kind: "fixture",
          name: "fixture-demo",
        },
      },
      null,
      2
    ),
    "utf8"
  );

  const adapter = new FileRoadmapAdapter(filePath);
  await adapter.fetch();
  const schema = await adapter.toInternalSchema();

  assert.equal(schema.project.id, "adapter-demo");
  assert.equal(schema.phases[0]?.title, "Phase 1");
  assert.equal(schema.tasks?.[0]?.phase_id, "phase-1");
  assert.equal(schema.metadata?.kind, "fixture");
});
