import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadTrackState } from "../src/state.js";
import { summarizeTrack } from "../src/summary.js";

const EXAMPLE_PATH = path.resolve("examples", "track-state.example.yaml");

test("loadTrackState reads the example YAML file", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-state-"));
  const trackDir = path.join(tempDir, ".track");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(trackDir, { recursive: true });
  await writeFile(path.join(trackDir, "state.yaml"), yaml, "utf8");

  const state = await loadTrackState(tempDir);
  assert.equal(state.project.name, "Track Demo");
  assert.equal(state.track.title, "Track MVP");
});

test("summarizeTrack returns the active checkpoint and next action", async () => {
  const yaml = await readFile(EXAMPLE_PATH, "utf8");
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-summary-"));
  const trackDir = path.join(tempDir, ".track");
  const statePath = path.join(trackDir, "state.yaml");

  await mkdir(trackDir, { recursive: true });
  await writeFile(statePath, yaml, "utf8");

  const state = await loadTrackState(tempDir, "state.yaml");
  const summary = summarizeTrack(state);

  assert.equal(summary.projectName, "Track Demo");
  assert.equal(summary.health, "yellow");
  assert.equal(summary.activeCheckpointTitle, "Text dashboard");
  assert.equal(summary.currentOwner, "codex");
  assert.match(summary.nextAction, /checkpoint weights/i);
});
