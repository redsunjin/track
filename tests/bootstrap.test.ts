import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  bootstrapTrack,
  planTrackBootstrapWrite,
  renderTrackBootstrapWritePlan,
  resolveBootstrapSources,
  summarizeTrackBootstrap,
  writeTrackBootstrap,
} from "../src/bootstrap.js";
import type { TrackBootstrapCommandRunner } from "../src/bootstrap.js";
import { loadTrackRoadmap } from "../src/roadmap.js";
import { loadTrackState } from "../src/state.js";

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

test("planTrackBootstrapWrite supports dry-run planning without writing files", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-write-plan-"));
  await writeFile(path.join(tempDir, "README.md"), "# Writable Bootstrap\n", "utf8");

  const plan = await planTrackBootstrapWrite({ cwd: tempDir, dryRun: true, from: "readme" });

  assert.equal(plan.ok, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.files.roadmap.action, "create");
  assert.equal(plan.files.state.action, "create");
  assert.deepEqual(
    plan.writes.map((file) => file.kind),
    ["roadmap", "state"]
  );
  assert.match(renderTrackBootstrapWritePlan(plan), /TRACK BOOTSTRAP WRITE DRY RUN/);
  await assert.rejects(() => readFile(path.join(tempDir, ".track", "roadmap.yaml"), "utf8"));
  await assert.rejects(() => readFile(path.join(tempDir, ".track", "state.yaml"), "utf8"));
});

test("writeTrackBootstrap writes projected roadmap and state files", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-write-"));
  await writeFile(path.join(tempDir, "README.md"), "# Writable Bootstrap\n\n## Roadmap\n\nShip it.\n", "utf8");

  const result = await writeTrackBootstrap({ cwd: tempDir, from: "readme" });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.written.map((file) => file.kind),
    ["roadmap", "state"]
  );
  assert.match(renderTrackBootstrapWritePlan(result), /TRACK BOOTSTRAP WRITTEN/);

  const roadmap = await loadTrackRoadmap(tempDir);
  const state = await loadTrackState(tempDir);
  assert.equal(roadmap.project.name, "Writable Bootstrap");
  assert.equal(state.project.name, "Writable Bootstrap");
  assert.equal(state.tasks?.[0]?.status, "doing");
});

test("writeTrackBootstrap refuses to overwrite existing Track files without force", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-conflict-"));
  await writeFile(path.join(tempDir, "README.md"), "# Conflict Bootstrap\n", "utf8");
  await mkdir(path.join(tempDir, ".track"), { recursive: true });
  await writeFile(path.join(tempDir, ".track", "roadmap.yaml"), "existing roadmap\n", "utf8");
  await writeFile(path.join(tempDir, ".track", "state.yaml"), "existing state\n", "utf8");

  const plan = await planTrackBootstrapWrite({ cwd: tempDir, from: "readme" });

  assert.equal(plan.ok, false);
  assert.deepEqual(
    plan.conflicts.map((file) => file.kind),
    ["roadmap", "state"]
  );
  assert.match(renderTrackBootstrapWritePlan(plan), /TRACK BOOTSTRAP WRITE BLOCKED/);
  await assert.rejects(() => writeTrackBootstrap({ cwd: tempDir, from: "readme" }), /would overwrite/);
  assert.equal(await readFile(path.join(tempDir, ".track", "roadmap.yaml"), "utf8"), "existing roadmap\n");
  assert.equal(await readFile(path.join(tempDir, ".track", "state.yaml"), "utf8"), "existing state\n");
});

test("writeTrackBootstrap force overwrites existing Track files", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-force-"));
  await writeFile(path.join(tempDir, "README.md"), "# Forced Bootstrap\n", "utf8");
  await mkdir(path.join(tempDir, ".track"), { recursive: true });
  await writeFile(path.join(tempDir, ".track", "roadmap.yaml"), "existing roadmap\n", "utf8");
  await writeFile(path.join(tempDir, ".track", "state.yaml"), "existing state\n", "utf8");

  const result = await writeTrackBootstrap({ cwd: tempDir, force: true, from: "readme" });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.written.map((file) => file.action),
    ["overwrite", "overwrite"]
  );
  const state = await loadTrackState(tempDir);
  assert.equal(state.project.name, "Forced Bootstrap");
});

test("writeTrackBootstrap writes harness adapter payload drafts", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-bootstrap-harness-write-"));
  await mkdir(path.join(tempDir, ".agent"), { recursive: true });
  await writeFile(
    path.join(tempDir, ".agent", "track-bootstrap.json"),
    JSON.stringify({
      project: { id: "harness-write", name: "Harness Write", mode: "sprint" },
      method: "gsd",
      goal: "Ship harness write",
      phases: [
        {
          id: "harness-execution",
          title: "Harness execution",
          checkpoints: [{ id: "validate-harness", title: "Validate with harness" }],
        },
      ],
      tasks: [{ id: "run-agent-harness", title: "Run harness", checkpoint_id: "validate-harness", status: "doing" }],
    }),
    "utf8"
  );

  const result = await writeTrackBootstrap({ cwd: tempDir, from: "harness" });
  const state = await loadTrackState(tempDir);

  assert.equal(result.state.track.topology, "harness");
  assert.equal(state.project.name, "Harness Write");
  assert.equal(state.tasks?.[0]?.title, "Run harness");
});
