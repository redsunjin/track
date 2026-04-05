import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { renderBuddy } from "../src/buddy.js";
import { loadTrackRoadmap } from "../src/roadmap.js";
import { loadTrackState } from "../src/state.js";
import { summarizeTrack } from "../src/summary.js";

test("renderBuddy prints a compact companion block", async () => {
  const root = path.resolve(".");
  const roadmap = await loadTrackRoadmap(root, ".track/roadmap.yaml");
  const state = await loadTrackState(root, ".track/state.yaml");
  const summary = summarizeTrack(state);
  const output = renderBuddy(summary, roadmap, state);

  assert.match(output, /TRACK COMPANION/);
  assert.match(output, /FLAG/);
  assert.match(output, /CP/);
  assert.match(output, /BAR/);
});
