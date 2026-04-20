import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { NotionRoadmapAdapter } from "../src/adapters/notion-adapter.js";

const NOTION_FIXTURE_PATH = path.resolve("examples", "notion-roadmap.example.json");

test("NotionRoadmapAdapter maps notion-style pages into the intermediate schema", async () => {
  const adapter = new NotionRoadmapAdapter(NOTION_FIXTURE_PATH);
  await adapter.fetch();
  const schema = await adapter.toInternalSchema();

  assert.equal(schema.project.name, "Track");
  assert.equal(schema.phases.length, 1);
  assert.equal(schema.phases[0]?.id, "phase-8");
  assert.equal(schema.phases[0]?.checkpoints?.length, 3);
  assert.equal(schema.phases[0]?.checkpoints?.[0]?.id, "cp-14");
  assert.equal(schema.phases[0]?.checkpoints?.[0]?.status, "done");
  assert.equal(schema.tasks?.[1]?.phase_id, "phase-8");
  assert.equal(schema.tasks?.[1]?.checkpoint_id, "cp-15");
  assert.equal(schema.metadata?.kind, "notion");
  assert.equal(schema.metadata?.name, "Track Roadmap");
});
