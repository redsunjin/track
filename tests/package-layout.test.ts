import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  checkTrackPackageDryRun,
  checkTrackPackageLayout,
  isPackagePathCovered,
  listTrackPackageBoundaries,
  renderPackageDryRunCheck,
  renderPackageLayoutCheck,
} from "../src/package-layout.js";

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
  assert.ok(boundaries.every((boundary) => boundary.releaseEntrypoint.length > 0));
  assert.ok(boundaries.every((boundary) => boundary.owns.length > 0));
});

test("package layout check passes when boundary entrypoints and owned paths exist", async () => {
  const result = await checkTrackPackageLayout(path.resolve("."));

  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
  assert.match(renderPackageLayoutCheck(result), /PACKAGE LAYOUT OK/);
  assert.match(renderPackageLayoutCheck(result), /track-core/);
});

test("package subpath exports resolve the release package entrypoints", async () => {
  const root = await import("track");
  const core = await import("track/core");
  const runtime = await import("track/runtime");
  const mcp = await import("track/mcp");
  const agents = await import("track/agents");
  const botBridge = await import("track/bot-bridge");
  const cli = await import("track/cli");
  const openclawAdapter = await import("track/openclaw-adapter");
  const openclawMonitor = await import("track/openclaw-monitor");
  const pitwallMonitor = await import("track/pitwall-monitor");
  const layout = await import("track/package-layout");

  assert.equal(typeof root.summarizeTrack, "function");
  assert.equal(typeof core.summarizeTrack, "function");
  assert.equal(typeof runtime.loadTrackState, "function");
  assert.equal(typeof mcp.TrackMCPServer, "function");
  assert.equal(typeof agents.exportAgentPack, "function");
  assert.equal(typeof botBridge.renderMonitorBotSummary, "function");
  assert.equal(typeof cli.renderOpenClawPitwall, "function");
  assert.equal(typeof openclawAdapter.buildOpenClawSnapshotFromToolData, "function");
  assert.equal(typeof openclawMonitor.buildOpenClawMonitorSnapshot, "function");
  assert.equal(typeof pitwallMonitor.buildPitwallMonitorView, "function");
  assert.equal(layout.TRACK_PACKAGE_BOUNDARIES.length, 6);
});

test("package dry-run verifies manifest allowlist coverage", async () => {
  const result = await checkTrackPackageDryRun(path.resolve("."));

  assert.equal(result.ok, true);
  assert.equal(result.privatePackage, true);
  assert.equal(result.publishable, false);
  assert.ok(result.filesAllowlist.includes("dist"));
  assert.ok(result.filesAllowlist.includes("src"));
  assert.ok(result.filesAllowlist.includes("docs"));
  assert.ok(result.exportEntries.find((entry) => entry.subpath === "./core" && entry.target === "dist/packages/core.js")?.covered);
  assert.ok(result.exportEntries.find((entry) => entry.subpath === "./core" && entry.target === "dist/packages/core.d.ts")?.covered);
  assert.ok(result.binEntries.find((entry) => entry.name === "track" && entry.target === "dist/cli.js")?.covered);
  assert.deepEqual(result.issues, []);
  assert.match(renderPackageDryRunCheck(result), /PACKAGE DRY-RUN OK/);
  assert.match(renderPackageDryRunCheck(result), /private-root/);
});

test("package coverage helper matches directories and exact files", () => {
  assert.equal(isPackagePathCovered(["src"], "src/packages/core.ts"), "src");
  assert.equal(isPackagePathCovered(["README.md"], "./README.md"), "README.md");
  assert.equal(isPackagePathCovered(["src"], "docs/package-layout.md"), null);
});
