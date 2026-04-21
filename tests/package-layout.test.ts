import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { checkTrackPackageLayout, listTrackPackageBoundaries, renderPackageLayoutCheck } from "../src/package-layout.js";

test("package boundaries define the publishable Track package split", () => {
  const boundaries = listTrackPackageBoundaries();
  const packageNames = boundaries.map((boundary) => boundary.packageName);

  assert.deepEqual(packageNames, [
    "track-core",
    "track-runtime",
    "track-mcp",
    "track-cli",
    "track-agents",
    "track-vscode",
  ]);
  assert.ok(boundaries.every((boundary) => boundary.entrypoint.length > 0));
  assert.ok(boundaries.every((boundary) => boundary.owns.length > 0));
});

test("package layout check passes when boundary entrypoints and owned paths exist", async () => {
  const result = await checkTrackPackageLayout(path.resolve("."));

  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
  assert.match(renderPackageLayoutCheck(result), /PACKAGE LAYOUT OK/);
  assert.match(renderPackageLayoutCheck(result), /track-core/);
});

test("package subpath exports resolve the source-level package entrypoints", async () => {
  const core = await import("track/core");
  const runtime = await import("track/runtime");
  const mcp = await import("track/mcp");
  const agents = await import("track/agents");
  const layout = await import("track/package-layout");

  assert.equal(typeof core.summarizeTrack, "function");
  assert.equal(typeof runtime.loadTrackState, "function");
  assert.equal(typeof mcp.TrackMCPServer, "function");
  assert.equal(typeof agents.exportAgentPack, "function");
  assert.equal(layout.TRACK_PACKAGE_BOUNDARIES.length, 6);
});
