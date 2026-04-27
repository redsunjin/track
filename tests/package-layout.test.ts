import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildTrackPackageHandoff,
  buildTrackNpmPublishDryRun,
  buildTrackReleaseNotesDraft,
  buildTrackReleaseCandidateTagDryRun,
  checkTrackPublishModeGuard,
  checkTrackPackageDryRun,
  checkTrackPackageLayout,
  checkTrackPublishReadiness,
  isPackagePathCovered,
  listTrackPackageBoundaries,
  renderPackageDryRunCheck,
  renderPackageHandoffNote,
  renderPackageNpmPublishDryRun,
  renderPackageLayoutCheck,
  renderPackagePublishModeGuard,
  renderPackageReadinessCheck,
  renderPackageReleaseCandidateTagDryRun,
  renderPackageReleaseNotesDraft,
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
  assert.equal(typeof layout.buildTrackReleaseNotesDraft, "function");
  assert.equal(typeof layout.buildTrackNpmPublishDryRun, "function");
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
  assert.equal(result.allowPrivateRootArtifact, false);
  assert.equal(result.status, "tag-dry-run-ready");
  assert.equal(result.candidateTag, "v0.1.0-rc.0");
  assert.equal(result.rc, 0);
  assert.ok(result.commands.includes('git tag -a v0.1.0-rc.0 -m "@redsunjin/track v0.1.0-rc.0"'));
  assert.ok(result.commands.includes("git push origin v0.1.0-rc.0"));
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /PACKAGE RC TAG DRY-RUN/);
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /tag-dry-run-ready/);
});

test("release candidate tag dry-run blocks private-root artifact tags by default", async () => {
  const repoRoot = await createPackageLayoutFixture({ privatePackage: true });
  const result = await buildTrackReleaseCandidateTagDryRun(repoRoot, { existingTags: [] });

  assert.equal(result.ok, false);
  assert.equal(result.status, "tag-dry-run-blocked");
  assert.equal(result.publishGuard.status, "private-held");
  assert.equal(result.checks.find((check) => check.id === "publish-guard")?.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "publish_guard_failed"));
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /expected publishable-ready/);
});

test("release candidate tag dry-run allows explicit private-root artifact tags", async () => {
  const repoRoot = await createPackageLayoutFixture({ privatePackage: true });
  const result = await buildTrackReleaseCandidateTagDryRun(repoRoot, {
    allowPrivateRootArtifact: true,
    existingTags: [],
  });

  assert.equal(result.ok, true);
  assert.equal(result.allowPrivateRootArtifact, true);
  assert.equal(result.status, "tag-dry-run-ready");
  assert.equal(result.publishGuard.status, "private-held");
  assert.equal(result.checks.find((check) => check.id === "publish-guard")?.ok, true);
  assert.match(renderPackageReleaseCandidateTagDryRun(result), /private-root artifact override accepted/);
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

test("release notes draft summarizes package install, CLI, verification, and recent slices", async () => {
  const result = await buildTrackReleaseNotesDraft(path.resolve("."), { existingTags: [] });
  const rendered = renderPackageReleaseNotesDraft(result);

  assert.equal(result.ok, true);
  assert.equal(result.status, "release-notes-ready");
  assert.equal(result.packageName, "@redsunjin/track");
  assert.equal(result.version, "0.1.0");
  assert.equal(result.installCommand, "npm install @redsunjin/track");
  assert.equal(result.npxCommand, "npx @redsunjin/track status");
  assert.ok(result.cliCommands.includes("track package readiness"));
  assert.ok(result.importSubpaths.includes("./core"));
  assert.ok(result.verificationCommands.includes("npm run package:install-smoke"));
  assert.ok(result.recentSlices.some((slice) => slice.id === "TRK-055"));
  assert.equal(result.releaseCandidate.status, "tag-dry-run-ready");
  assert.match(rendered, /# @redsunjin\/track@0\.1\.0 Release Notes Draft/);
  assert.match(rendered, /npm install @redsunjin\/track/);
  assert.match(rendered, /track package rc-tag/);
  assert.match(rendered, /TRK-055 Publishable RC Gate Tightening/);
  assert.match(rendered, /Final publish still requires release-owner npm authentication/);
});

test("release notes draft is blocked when RC tag readiness is blocked", async () => {
  const result = await buildTrackReleaseNotesDraft(path.resolve("."), { existingTags: ["v0.1.0-rc.0"] });

  assert.equal(result.ok, false);
  assert.equal(result.status, "release-notes-blocked");
  assert.equal(result.releaseCandidate.status, "tag-dry-run-blocked");
  assert.match(renderPackageReleaseNotesDraft(result), /release-notes-blocked/);
});

test("npm publish dry-run report blocks on missing npm auth without hiding dry-run results", async () => {
  const result = await buildTrackNpmPublishDryRun(path.resolve("."), {
    existingTags: [],
    runner: async (_repoRoot, command, args) => {
      const fullCommand = [command, ...args].join(" ");
      if (fullCommand === "npm whoami") {
        return {
          exitCode: 1,
          stderr: "npm error code ENEEDAUTH\n",
          stdout: "",
        };
      }
      return {
        exitCode: 0,
        stderr: "",
        stdout: fullCommand === "npm publish --dry-run --access public" ? "+ @redsunjin/track@0.1.0\n" : "ok\n",
      };
    },
  });
  const rendered = renderPackageNpmPublishDryRun(result);

  assert.equal(result.ok, false);
  assert.equal(result.status, "publish-dry-run-blocked");
  assert.equal(result.commandResults.find((entry) => entry.id === "npm-auth")?.ok, false);
  assert.equal(result.commandResults.find((entry) => entry.id === "npm-publish-dry-run")?.ok, true);
  assert.ok(result.issues.some((issue) => issue.code === "npm_auth_failed"));
  assert.equal(result.finalPublishCommand, "npm publish --access public");
  assert.match(rendered, /PACKAGE NPM PUBLISH DRY-RUN BLOCKED/);
  assert.match(rendered, /npm_auth_failed/);
});

test("npm publish dry-run report is ready when release gates and npm commands pass", async () => {
  const result = await buildTrackNpmPublishDryRun(path.resolve("."), {
    existingTags: [],
    runner: async (_repoRoot, command, args) => ({
      exitCode: 0,
      stderr: "",
      stdout: [command, ...args].join(" ") === "npm whoami" ? "redsunjin\n" : "ok\n",
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "publish-dry-run-ready");
  assert.ok(result.commandResults.every((entry) => entry.ok));
  assert.equal(result.issues.length, 0);
  assert.match(renderPackageNpmPublishDryRun(result), /npm publish --access public/);
});

test("package coverage helper matches directories and exact files", () => {
  assert.equal(isPackagePathCovered(["src"], "src/packages/core.ts"), "src");
  assert.equal(isPackagePathCovered(["README.md"], "./README.md"), "README.md");
  assert.equal(isPackagePathCovered(["src"], "docs/package-layout.md"), null);
});

async function createPackageLayoutFixture(options: { privatePackage: boolean }): Promise<string> {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "track-package-layout-"));
  const boundaries = listTrackPackageBoundaries();
  const exportTargets = new Set(["dist/index.js", "dist/index.d.ts", "dist/cli.js"]);
  const exportsMap: Record<string, unknown> = {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    },
  };

  for (const boundary of boundaries) {
    const subpath = `./${boundary.name}`;
    exportsMap[subpath] =
      boundary.name === "vscode"
        ? `./${boundary.releaseEntrypoint}`
        : {
            types: `./${boundary.releaseEntrypoint.replace(/\.js$/, ".d.ts")}`,
            import: `./${boundary.releaseEntrypoint}`,
          };
    exportTargets.add(boundary.releaseEntrypoint);
    if (boundary.releaseEntrypoint.endsWith(".js")) {
      exportTargets.add(boundary.releaseEntrypoint.replace(/\.js$/, ".d.ts"));
    }
  }

  await writePackageFixtureFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "@redsunjin/track",
        version: "0.1.0",
        private: options.privatePackage,
        type: "module",
        files: ["dist", "src", "agents", "docs", "vscode-extension", "README.md", "AGENTS.md"],
        exports: exportsMap,
        bin: {
          track: "./dist/cli.js",
        },
        scripts: {
          build: "echo build",
          typecheck: "echo typecheck",
          test: "echo test",
          "check:harness": "echo harness",
          "package:dry-run": "echo package dry-run",
          "package:install-smoke": "echo install smoke",
        },
        engines: {
          node: ">=20",
        },
      },
      null,
      2
    )}\n`
  );

  for (const target of exportTargets) {
    await writePackageFixtureFile(repoRoot, target, "");
  }
  for (const requiredPath of ["README.md", "AGENTS.md", "docs/package-layout.md"]) {
    await writePackageFixtureFile(repoRoot, requiredPath, "");
  }
  for (const boundary of boundaries) {
    await createPackageFixturePath(repoRoot, boundary.entrypoint);
    for (const ownedPath of boundary.owns) {
      await createPackageFixturePath(repoRoot, ownedPath);
    }
  }

  return repoRoot;
}

async function createPackageFixturePath(repoRoot: string, relativePath: string): Promise<void> {
  if (path.extname(relativePath)) {
    await writePackageFixtureFile(repoRoot, relativePath, "");
    return;
  }

  await mkdir(path.join(repoRoot, relativePath), { recursive: true });
}

async function writePackageFixtureFile(repoRoot: string, relativePath: string, contents: string): Promise<void> {
  const targetPath = path.join(repoRoot, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents);
}
