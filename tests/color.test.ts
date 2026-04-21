import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { stripAnsi } from "../src/ansi.js";
import { renderBuddy } from "../src/buddy.js";
import { generateTrackMap, renderTrackMap } from "../src/generator.js";
import { renderPitwall, renderPitwallDetail } from "../src/pitwall.js";
import { loadTrackRoadmap } from "../src/roadmap.js";
import { renderNext, renderStatus } from "../src/render.js";
import { loadTrackState } from "../src/state.js";
import { summarizeTrack } from "../src/summary.js";

test("terminal renderers support ansi color and no-color fallback", async () => {
  const root = path.resolve(".");
  const state = await loadTrackState(root, ".track/state.yaml");
  const roadmap = await loadTrackRoadmap(root, ".track/roadmap.yaml");
  const summary = summarizeTrack(state);
  const segments = generateTrackMap(roadmap, state);
  const metrics = {
    activeTaskCount: 0,
    blockedTaskCount: 0,
    lastEventAt: null,
    paceDeltaPercent: null,
    staleState: "unknown" as const,
    updateAgeMinutes: null,
  };
  const detail = {
    metrics,
    repoPath: root,
    state,
    summary,
    roadmap,
    segments,
  };

  const statusColor = renderStatus(summary, { color: true });
  const nextColor = renderNext(summary, { color: true });
  const companionColor = renderBuddy(summary, roadmap, state, { color: true });
  const mapColor = renderTrackMap(roadmap.project.name, segments, { color: true });
  const pitwallColor = renderPitwall(root, [{ metrics, repoPath: root, summary }], { color: true });
  const detailColor = renderPitwallDetail(detail, { color: true });

  assert.match(statusColor, /\u001b\[/);
  assert.match(nextColor, /\u001b\[/);
  assert.match(companionColor, /\u001b\[/);
  assert.match(mapColor, /\u001b\[/);
  assert.match(pitwallColor, /\u001b\[/);
  assert.match(detailColor, /\u001b\[/);

  assert.match(stripAnsi(statusColor), /TRACK \/\/ DRIVER HUD/);
  assert.match(stripAnsi(companionColor), /TRACK COMPANION/);
  assert.match(stripAnsi(mapColor), /TRACK \/\/ MAP GENERATOR/);
  assert.match(stripAnsi(pitwallColor), /Pitwall \/\/ Race Control/);
});

test("terminal renderers stay plain when color is disabled", async () => {
  const root = path.resolve(".");
  const state = await loadTrackState(root, ".track/state.yaml");
  const roadmap = await loadTrackRoadmap(root, ".track/roadmap.yaml");
  const summary = summarizeTrack(state);
  const output = [
    renderStatus(summary, { color: false }),
    renderBuddy(summary, roadmap, state, { color: false }),
    renderTrackMap(roadmap.project.name, generateTrackMap(roadmap, state), { color: false }),
  ].join("\n");

  assert.doesNotMatch(output, /\u001b\[/);
  assert.match(output, /FLAG/);
  assert.match(output, /COURSE/);
});
