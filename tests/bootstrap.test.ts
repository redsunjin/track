import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { bootstrapTrack, resolveBootstrapSources, summarizeTrackBootstrap } from "../src/bootstrap.js";
import type { TrackBootstrapCommandRunner } from "../src/bootstrap.js";

const gitRunner: TrackBootstrapCommandRunner = {
  async run(command, args) {
    assert.equal(command, "git");
    if (args.join(" ") === "rev-parse --abbrev-ref HEAD") {
      return { exitCode: 0, stderr: "", stdout: "feature/bootstrap\n" };
    }
    if (args.join(" ") === "status --short") {
      return { exitCode: 0, stderr: "", stdout: " M README.md\n?? TODO.md\n" };
    }
    return { exitCode: 1, stderr: "unexpected command", stdout: "" };
  },
};

test("resolveBootstrapSources expands auto and validates explicit sources", () => {
  assert.deepEqual(resolveBootstrapSources(undefined), ["readme", "package", "git"]);
  assert.deepEqual(resolveBootstrapSources("package,readme,package"), ["package", "readme"]);
  assert.throws(() => resolveBootstrapSources("jira"), /--from/);
});

test("bootstrapTrack projects README package and git evidence into a draft", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-"));
  await writeFile(
    path.join(tempDir, "README.md"),
    ["# Bootstrap App", "", "## Goals", "", "Ship the first slice."].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "@example/bootstrap-app",
        version: "1.2.3",
        scripts: {
          build: "tsc",
          test: "node --test",
        },
      },
      null,
      2
    ),
    "utf8"
  );

  const result = await bootstrapTrack({ commandRunner: gitRunner, cwd: tempDir });

  assert.equal(result.state.project.name, "Bootstrap App");
  assert.equal(result.state.project.id, "bootstrap-app");
  assert.equal(result.roadmap.roadmap.phases.length, 1);
  assert.equal(result.roadmap.roadmap.phases[0]?.checkpoints?.length, 3);
  assert.equal(result.state.tasks?.[0]?.status, "doing");
  assert.deepEqual(
    result.evidence.map((entry) => [entry.kind, entry.present]),
    [
      ["readme", true],
      ["package", true],
      ["git", true],
    ]
  );
  assert.equal(result.warnings.length, 0);
  assert.match(summarizeTrackBootstrap(result), /TRACK BOOTSTRAP DRAFT/);
  assert.match(summarizeTrackBootstrap(result), /branch feature\/bootstrap/);
});

test("bootstrapTrack can draft from a missing-source repo with warnings", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-missing-"));
  const missingGitRunner: TrackBootstrapCommandRunner = {
    async run() {
      return { exitCode: 128, stderr: "not a git repo", stdout: "" };
    },
  };

  const result = await bootstrapTrack({ commandRunner: missingGitRunner, cwd: tempDir, from: "readme,package,git" });

  assert.equal(result.state.project.name.startsWith("Track Bootstrap Missing"), true);
  assert.deepEqual(
    result.evidence.map((entry) => entry.present),
    [false, false, false]
  );
  assert.deepEqual(result.warnings, [
    "README evidence not found.",
    "package.json evidence not found.",
    "git evidence not available.",
  ]);
});

test("bootstrapTrack title-cases package names when README is not selected", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-package-"));
  await writeFile(path.join(tempDir, "package.json"), JSON.stringify({ name: "@scope/package-only" }), "utf8");

  const result = await bootstrapTrack({ cwd: tempDir, from: "package" });

  assert.equal(result.state.project.name, "Package Only");
  assert.equal(result.state.project.id, "package-only");
});
