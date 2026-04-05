import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { generateTrackMap, renderTrackMap } from "../src/generator.js";
import { loadTrackRoadmap } from "../src/roadmap.js";
import { loadTrackState } from "../src/state.js";

test("generateTrackMap derives segment types from roadmap difficulty", async () => {
  const root = path.resolve(".");
  const roadmap = await loadTrackRoadmap(root, ".track/roadmap.yaml");
  const state = await loadTrackState(root, ".track/state.yaml");
  const segments = generateTrackMap(roadmap, state);

  assert.equal(segments.length, 6);
  assert.equal(segments[0]?.type, "sprint");
  assert.equal(segments[2]?.type, "climb");
  assert.equal(segments[2]?.progressState, "done");
  assert.equal(segments[3]?.type, "fork");
  assert.equal(segments[3]?.progressState, "done");
  assert.equal(segments[4]?.progressState, "done");
  assert.equal(segments[5]?.progressState, "active");
});

test("renderTrackMap prints a roadmap-derived course overview", async () => {
  const root = path.resolve(".");
  const roadmap = await loadTrackRoadmap(root, ".track/roadmap.yaml");
  const state = await loadTrackState(root, ".track/state.yaml");
  const output = renderTrackMap(roadmap.project.name, generateTrackMap(roadmap, state));

  assert.match(output, /TRACK \/\/ MAP GENERATOR/);
  assert.match(output, /COURSE/);
  assert.match(output, /MCP contract/);
  assert.match(output, /Claude\/Codex\/Gemini command adapters/);
});
