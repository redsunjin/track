import assert from "node:assert/strict";
import test from "node:test";

import type { IntermediateRoadmapSchema } from "../src/adapter-schema.js";
import { MockRoadmapAdapter } from "../src/adapters/base.js";

test("MockRoadmapAdapter returns the provided schema", async () => {
  const schema: IntermediateRoadmapSchema = {
    version: 1,
    project: {
      id: "test-project",
      name: "Test Project",
    },
    phases: [
      {
        id: "phase-1",
        title: "Phase 1",
        checkpoints: [
          {
            id: "cp-1",
            title: "Checkpoint 1",
            status: "done",
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
  };

  const adapter = new MockRoadmapAdapter(schema);
  await adapter.fetch();
  const result = await adapter.toInternalSchema();

  assert.equal(result.version, 1);
  assert.equal(result.project.name, "Test Project");
  assert.equal(result.phases.length, 1);
  assert.equal(result.phases[0]?.id, "phase-1");
  assert.equal(result.tasks?.length, 1);
  assert.equal(result.tasks?.[0]?.title, "Task 1");
});

test("MockRoadmapAdapter throws when no data is loaded", async () => {
  const adapter = new MockRoadmapAdapter(undefined as unknown as IntermediateRoadmapSchema);
  await assert.rejects(() => adapter.toInternalSchema(), /No data loaded in MockRoadmapAdapter/);
});
