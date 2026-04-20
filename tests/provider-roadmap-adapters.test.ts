import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { GitHubRoadmapAdapter } from "../src/adapters/github-adapter.js";
import { JiraRoadmapAdapter } from "../src/adapters/jira-adapter.js";
import { LinearRoadmapAdapter } from "../src/adapters/linear-adapter.js";

test("GitHubRoadmapAdapter maps milestone fixtures into the intermediate schema", async () => {
  const adapter = new GitHubRoadmapAdapter(path.resolve("examples", "github-roadmap.example.json"));
  await adapter.fetch();
  const schema = await adapter.toInternalSchema();

  assert.equal(schema.metadata?.kind, "github");
  assert.equal(schema.metadata?.name, "openai/track");
  assert.equal(schema.phases[0]?.checkpoints?.[0]?.id, "cp-17a");
  assert.equal(schema.tasks?.[0]?.phase_id, "phase-8");
  assert.equal(schema.tasks?.[0]?.status, "doing");
});

test("JiraRoadmapAdapter maps epic fixtures into the intermediate schema", async () => {
  const adapter = new JiraRoadmapAdapter(path.resolve("examples", "jira-roadmap.example.json"));
  await adapter.fetch();
  const schema = await adapter.toInternalSchema();

  assert.equal(schema.metadata?.kind, "jira");
  assert.equal(schema.metadata?.name, "TRK");
  assert.equal(schema.metadata?.site, "https://track.atlassian.net");
  assert.equal(schema.phases[0]?.checkpoints?.[0]?.id, "cp-17b");
  assert.equal(schema.tasks?.[0]?.id, "TRK-201");
});

test("LinearRoadmapAdapter maps cycle fixtures into the intermediate schema", async () => {
  const adapter = new LinearRoadmapAdapter(path.resolve("examples", "linear-roadmap.example.json"));
  await adapter.fetch();
  const schema = await adapter.toInternalSchema();

  assert.equal(schema.metadata?.kind, "linear");
  assert.equal(schema.metadata?.name, "TRACK");
  assert.equal(schema.metadata?.workspace, "Track Workspace");
  assert.equal(schema.phases[0]?.checkpoints?.[0]?.status, "blocked");
  assert.equal(schema.tasks?.[0]?.status, "blocked");
});
