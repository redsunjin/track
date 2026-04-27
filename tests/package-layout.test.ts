import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  buildTrackPackageHandoff,
  buildTrackReleaseCandidateTagDryRun,
  checkTrackPublishModeGuard,
  checkTrackPackageDryRun,
  checkTrackPackageLayout,
  checkTrackPublishReadiness,
  isPackagePathCovered,
  listTrackPackageBoundaries,
  renderPackageDryRunCheck,
  renderPackageHandoffNote,
  renderPackageLayoutCheck,
  renderPackagePublishModeGuard,
  renderPackageReadinessCheck,
  renderPackageReleaseCandidateTagDryRun,
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
  const root = await import("@redsunjin/track");
  const core = await import("@redsunjin/track/core");
  const runtime = await import("@redsunjin/track/runtime");
  const mcp = await import("@redsunjin/track/mcp");
  const agents = await import("@redsunjin/track/agents");
  const botBridge = await import("@redsunjin/track/bot-bridge");
  const cli = await import("@redsunjin/track/cli");
  const openclawAdapter = await import("@redsunjin/track/openclaw-adapter");
  const openclawLive = await import("@redsunjin/track/openclaw-live");
  const openclawMonitor = await import("@redsunjin/track/openclaw-monitor");
  const pitwallMonitor = await import("@redsunjin/track/pitwall-monitor");
  const layout = await import("@redsunjin/track/package-layout");

  assert.equal(typeof root.summarizeTrack, "function");
  assert.equal(typeof core.summarizeTrack, "function");
  assert.equal(typeof runtime.loadTrackState, "function");
  assert.equal(typeof mcp.TrackMCPServer, "function");
  assert.equal(typeof agents.exportAgentPack, "function");
  assert.equal(typeof botBridge.renderMonitorBotSummary, "function");
  assert.equal(typeof botBridge.buildMonitorBotPushEvents, "function");
  assert.equal(typeof cli.renderOpenClawPitwall, "function");
  assert.equal(typeof openclawAdapter.buildOpenClawSnapshotFromToolData, "function");
  assert.equal(typeof openclawLive.captureOpenClawTelemetry, "function");
  assert.equal(typeof openclawMonitor.buildOpenClawMonitorSnapshot, "function");
  assert.equal(typeof pitwallMonitor.buildPitwallMonitorView, "function");
  assert.equal(typeof layout.buildTrackPackageHandoff, "function");
  assert.equal(typeof layout.checkTrackPublishModeGuard, "function");
  assert.equal(typeof layout.buildTrackReleaseCandidateTagDryRun, "function");
  assert.equal(layout.TRACK_PACKAGE_BOUNDARIES.length, 6);
});

test("package dry-run verifies manifest allowlist coverage", async () => {
  const result = await checkTrackPackageDryRun(path.resolve("."));

  assert.equal(result.ok, true);
  assert.equal(result.packageName, "@redsunjin/track");
  assert.equal(result.privatePackage, false);
  assert.equal(result.publishable, true);
  assert.ok(result.filesAllowlist.includes("dist"));
  assert.ok(result.filesAllowlist.includes("src"));
  assert.ok(result.filesAllowlist.includes("docs"));
  assert.ok(result.exportEntries.find((entry) => entry.subpath === "./core" && entry.target === "dist/packages/core.js")?.covered);
  assert.ok(result.exportEntries.find((entry) => entry.subpath === "./core" && entry.target === "dist/packages/core.d.ts")?.covered);
  assert.ok(result.binEntries.find((entry) => entry.name === "track" && entry.target === "dist/cli.js")?.covered);
  assert.deepEqual(result.issues, []);
  assert.match(renderPackageDryRunCheck(result), /PACKAGE DRY-RUN OK/);
  assert.match(renderPackageDryRunCheck(result), /publishable/);
});

test("package readiness gate checks release verification scripts and pack readiness", async () => {
  const result = await checkTrackPublishReadiness(path.resolve("."));

  assert.equal(result.ok, true);
  assert.equal(result.mode, "publishable");
  assert.equal(result.dryRun.ok, true);
  assert.deepEqual(
    result.gates.map((gate) => gate.id),
    [
      "build",
      "typecheck",
      "test",
      "harness",
      "package-dry-run",
      "install-smoke",
      "npm-pack-dry-run",
      "release-mode",
    ]
  );
  assert.ok(result.gates.every((gate) => gate.ok));
  assert.match(renderPackageReadinessCheck(result), /PACKAGE READINESS GATE OK/);
  assert.match(renderPackageReadinessCheck(result), /npm pack --dry-run --json/);
});

test("package handoff notes summarize release status, commands, subpaths, and docs", async () => {
  const result = await buildTrackPackageHandoff(path.resolve("."));

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready-publishable");
  assert.equal(result.mode, "publishable");
  assert.ok(result.publicSubpaths.includes("./core"));
  assert.ok(result.docs.includes("docs/package-layout.md"));
  assert.ok(result.recommendedCommands.includes("npm run package:readiness"));
  assert.equal(result.boundaries.length, 6);
  assert.match(renderPackageHandoffNote(result), /PACKAGE RELEASE HANDOFF/);
  assert.match(renderPackageHandoffNote(result), /ready-publishable/);
});

test("publish mode guard reports the current scoped package as publishable-ready", async () => {
  const result = await checkTrackPublishModeGuard(path.resolve("."));

  assert.equal(result.ok, true);
  assert.equal(result.currentMode, "publishable");
  assert.equal(result.targetMode, "current");
  assert.equal(result.status, "publishable-ready");
  assert.equal(result.privatePackage, false);
  assert.equal(result.publishConfig.present, true);
  assert.equal(result.publishConfig.access, "public");
  assert.ok(result.checks.find((check) => check.id === "package-shape")?.ok);
  assert.match(renderPackagePublishModeGuard(result), /PACKAGE PUBLISH MODE GUARD/);
  assert.match(renderPackagePublishModeGuard(result), /publishable-ready/);
});

test("publish mode guard accepts an explicit publishable target for the scoped package", async () => {
  const result = await checkTrackPublishModeGuard(path.resolve("."), { targetMode: "publishable" });

  assert.equal(result.ok, true);
  assert.equal(result.currentMode, "publishable");
  assert.equal(result.targetMode, "publishable");
  assert.equal(result.status, "publishable-ready");
  assert.equal(result.privatePackage, false);
  assert.equal(result.publishConfig.present, true);
  assert.equal(result.publishConfig.access, "public");
  assert.deepEqual(result.issues, []);
  assert.match(renderPackagePublishModeGuard(result), /PACKAGE PUBLISH MODE GUARD/);
  assert.match(renderPackagePublishModeGuard(result), /publishable-ready/);
});

test("release candidate tag dry-run prepares a tag command without creating a tag", async () => {
  const result = await buildTrackReleaseCandidateTagDryRun(path.resolve("."), { existingTags: [] });

  assert.equal(result.ok, true);
  assert.equal(result.status, "tag-dry-run-ready");
  assert.equal(result.candidateTag, "v0.1.0-rc.0");
  assert.equal(result.rc, 0);
  assert.ok(result.commands.includes('git tag -a v0.1.0-rc.0 -m "@redsunjin/track v0.1.0-rc.0"'));
  assert.ok(result.commands.includes("git push origin v0.1.0-rc.0"));
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /PACKAGE RC TAG DRY-RUN/);
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /tag-dry-run-ready/);
});

test("release candidate tag dry-run blocks an existing candidate tag", async () => {
  const result = await buildTrackReleaseCandidateTagDryRun(path.resolve("."), {
    existingTags: ["v0.1.0-rc.0"],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "tag-dry-run-blocked");
  assert.ok(result.issues.some((issue) => issue.code === "tag_already_exists"));
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /PACKAGE RC TAG DRY-RUN BLOCKED/);
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /tag_already_exists/);
});

test("package coverage helper matches directories and exact files", () => {
  assert.equal(isPackagePathCovered(["src"], "src/packages/core.ts"), "src");
  assert.equal(isPackagePathCovered(["README.md"], "./README.md"), "README.md");
  assert.equal(isPackagePathCovered(["src"], "docs/package-layout.md"), null);
});
