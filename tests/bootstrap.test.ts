import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
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
  assert.deepEqual(resolveBootstrapSources(undefined), ["readme", "package", "git", "plan", "harness", "agent"]);
  assert.deepEqual(resolveBootstrapSources("package,readme,package,plan"), ["package", "readme", "plan"]);
  assert.deepEqual(resolveBootstrapSources("harness,skill,agent"), ["harness", "agent"]);
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
    path.join(tempDir, "ROADMAP.md"),
    ["# Bootstrap App Roadmap", "", "## First slice", "", "Ship the first slice."].join("\n"),
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

  const result = await bootstrapTrack({ commandRunner: gitRunner, cwd: tempDir, from: "readme,package,git,plan" });

  assert.equal(result.state.project.name, "Bootstrap App");
  assert.equal(result.state.project.id, "bootstrap-app");
  assert.equal(result.roadmap.roadmap.phases.length, 1);
  assert.equal(result.roadmap.roadmap.phases[0]?.checkpoints?.length, 3);
  assert.equal(result.state.tasks?.[0]?.status, "doing");
  assert.equal(result.builder.needed, false);
  assert.deepEqual(
    result.evidence.map((entry) => [entry.kind, entry.present]),
    [
      ["readme", true],
      ["package", true],
      ["git", true],
      ["plan", true],
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

  const result = await bootstrapTrack({ commandRunner: missingGitRunner, cwd: tempDir, from: "readme,package,git,plan" });

  assert.equal(result.state.project.name.startsWith("Track Bootstrap Missing"), true);
  assert.deepEqual(
    result.evidence.map((entry) => entry.present),
    [false, false, false, false]
  );
  assert.deepEqual(result.warnings, [
    "README evidence not found.",
    "package.json evidence not found.",
    "git evidence not available.",
    "planning evidence not found.",
  ]);
  assert.equal(result.builder.needed, true);
  assert.match(summarizeTrackBootstrap(result), /TRACK BUILDER/);
});

test("bootstrapTrack title-cases package names when README is not selected", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-package-"));
  await writeFile(path.join(tempDir, "package.json"), JSON.stringify({ name: "@scope/package-only" }), "utf8");

  const result = await bootstrapTrack({ cwd: tempDir, from: "package" });

  assert.equal(result.state.project.name, "Package Only");
  assert.equal(result.state.project.id, "package-only");
});

test("bootstrapTrack treats planning headings in README as plan evidence", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-readme-plan-"));
  await writeFile(path.join(tempDir, "README.md"), ["# Readme Plan", "", "## Roadmap", "", "First slice."].join("\n"), "utf8");

  const result = await bootstrapTrack({ commandRunner: gitRunner, cwd: tempDir, from: "readme,plan" });

  assert.equal(result.builder.needed, false);
  assert.deepEqual(
    result.evidence.map((entry) => [entry.kind, entry.present]),
    [
      ["readme", true],
      ["plan", false],
    ]
  );
  assert.equal(result.warnings.length, 0);
});

test("bootstrapTrack projects an explicit harness adapter payload into a draft", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-harness-"));
  await mkdir(path.join(tempDir, ".agent"), { recursive: true });
  await writeFile(
    path.join(tempDir, ".agent", "track-bootstrap.json"),
    JSON.stringify(
      {
        version: 1,
        source: "project-harness-runner",
        project: {
          id: "harness-app",
          name: "Harness App",
          mode: "sprint",
        },
        method: "gsd",
        goal: "MVP complete",
        validation: {
          preferred: "scripts/agent-harness.sh",
          checks: ["npm run check"],
          smokes: ["npm run smoke"],
        },
        phases: [
          {
            id: "harness-execution",
            title: "Harness execution",
            checkpoints: [
              { id: "define-next-slice", title: "Define next implementation slice" },
              { id: "validate-harness", title: "Validate with harness" },
            ],
          },
        ],
        tasks: [
          {
            id: "run-agent-harness",
            title: "Run existing validation harness",
            checkpoint_id: "validate-harness",
            owner: "codex",
            status: "doing",
          },
        ],
      },
      null,
      2
    ),
    "utf8"
  );

  const result = await bootstrapTrack({ cwd: tempDir, from: "harness" });

  assert.equal(result.state.project.name, "Harness App");
  assert.equal(result.state.project.mode, "sprint");
  assert.equal(result.state.track.topology, "harness");
  assert.equal(result.state.tasks?.[0]?.title, "Run existing validation harness");
  assert.equal(result.builder.needed, false);
  assert.deepEqual(
    result.evidence.map((entry) => [entry.kind, entry.present]),
    [["harness", true]]
  );
  assert.match(result.evidence[0]?.detail ?? "", /adapter payload/);
  assert.equal(result.warnings.length, 0);
});

test("bootstrapTrack treats harness files and agent files as planning evidence", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-agent-"));
  await mkdir(path.join(tempDir, "scripts"), { recursive: true });
  await mkdir(path.join(tempDir, ".agent"), { recursive: true });
  await writeFile(path.join(tempDir, "scripts", "agent-harness.sh"), "#!/usr/bin/env bash\nnpm test\n", "utf8");
  await writeFile(path.join(tempDir, ".agent", "orchestration-contract.md"), "# Orchestration Contract\n", "utf8");

  const result = await bootstrapTrack({ cwd: tempDir, from: "harness,agent" });

  assert.equal(result.builder.needed, false);
  assert.equal(result.roadmap.roadmap.phases[0]?.checkpoints?.some((checkpoint) => checkpoint.id === "cp-bootstrap-harness"), true);
  assert.equal(result.roadmap.roadmap.phases[0]?.checkpoints?.some((checkpoint) => checkpoint.id === "cp-bootstrap-agent"), true);
  assert.deepEqual(
    result.evidence.map((entry) => [entry.kind, entry.present]),
    [
      ["harness", true],
      ["agent", true],
    ]
  );
  assert.equal(result.warnings.length, 0);
});
