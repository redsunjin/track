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
  const checkpointCount = roadmap.roadmap.phases.reduce((sum, phase) => sum + (phase.checkpoints?.length ?? 0), 0);
  const stateCheckpoints = state.laps?.flatMap((lap) => lap.checkpoints ?? []) ?? [];
  const lastCheckpoint = state.laps?.at(-1)?.checkpoints?.at(-1);
  const hasExplicitActiveCheckpoint = stateCheckpoints.some(
    (checkpoint) => checkpoint.status === "doing" || checkpoint.status === "blocked"
  );
  const firstPendingCheckpointId = stateCheckpoints.find((checkpoint) => checkpoint.status !== "done")?.id;
  const expectedLastProgressState =
    lastCheckpoint?.status === "done"
      ? "done"
      : lastCheckpoint?.status === "doing" || lastCheckpoint?.status === "blocked"
        ? "active"
        : !hasExplicitActiveCheckpoint && lastCheckpoint?.id === firstPendingCheckpointId
          ? "active"
        : "upcoming";

  assert.equal(segments.length, checkpointCount);
  assert.equal(segments[0]?.type, "sprint");
  assert.equal(segments[2]?.type, "climb");
  assert.equal(segments[2]?.progressState, "done");
  assert.equal(segments[3]?.type, "fork");
  assert.equal(segments[3]?.progressState, "done");
  assert.equal(segments[4]?.progressState, "done");
  assert.equal(segments[5]?.progressState, "done");
  assert.equal(segments[6]?.type, "chicane");
  assert.equal(segments[6]?.progressState, "done");
  assert.equal(segments[7]?.progressState, "done");
  assert.equal(segments.at(-1)?.progressState, expectedLastProgressState);
});

test("renderTrackMap prints a roadmap-derived course overview", async () => {
  const root = path.resolve(".");
  const roadmap = await loadTrackRoadmap(root, ".track/roadmap.yaml");
  const state = await loadTrackState(root, ".track/state.yaml");
  const output = renderTrackMap(roadmap.project.name, generateTrackMap(roadmap, state));

  assert.match(output, /TRACK \/\/ MAP GENERATOR/);
  assert.match(output, /MODE     RETRO COURSE BOARD/);
  assert.match(output, /COURSE/);
  assert.match(output, /LEGEND/);
  assert.match(output, /\[#01>>>>\]/);
  assert.match(output, /MCP contract/);
  assert.match(output, /Claude\/Codex\/Gemini command adapters/);
  assert.match(output, /Generic plan import adapter/);
});
