import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadPitwallDetail,
  loadPitwallOwnerLoad,
  renderPitwall,
  renderPitwallDetail,
  renderPitwallOwners,
  renderPitwallQueue,
  resolvePitwallRepo,
  scanPitwall,
} from "../src/pitwall.js";

const EXAMPLE_PATH = path.resolve("examples", "track-state.example.yaml");
const ROADMAP_PATH = path.resolve(".track", "roadmap.yaml");

test("scanPitwall finds track projects in a workspace root", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pitwall-"));
  const repoA = path.join(tempRoot, "repo-a");
  const repoB = path.join(tempRoot, "repo-b");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(path.join(repoA, ".track"), { recursive: true });
  await mkdir(path.join(repoB, ".track"), { recursive: true });

  await writeFile(path.join(repoA, ".track", "state.yaml"), yaml, "utf8");
  await writeFile(
    path.join(repoB, ".track", "state.yaml"),
    yaml.replace("Track Demo", "Repo B").replace("yellow", "red"),
    "utf8"
  );

  const entries = await scanPitwall(tempRoot);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.summary.health, "red");
  assert.ok(entries.some((entry) => entry.summary.projectName === "Track Demo"));
});

test("renderPitwall prints a terminal summary", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pitwall-render-"));
  const repoA = path.join(tempRoot, "repo-a");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(path.join(repoA, ".track"), { recursive: true });
  await writeFile(path.join(repoA, ".track", "state.yaml"), yaml, "utf8");

  const entries = await scanPitwall(tempRoot, { now: new Date("2026-04-05T10:40:00+09:00") });
  const output = renderPitwall(tempRoot, entries);

  assert.match(output, /Pitwall/);
  assert.match(output, /repo-a/);
  assert.match(output, /Text dashboard/);
  assert.match(output, /AGE/);
  assert.match(output, /PACE/);
});

test("renderPitwallQueue prints flagged or stale items", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pitwall-queue-"));
  const repoA = path.join(tempRoot, "repo-a");
  const repoB = path.join(tempRoot, "repo-b");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(path.join(repoA, ".track"), { recursive: true });
  await mkdir(path.join(repoB, ".track"), { recursive: true });

  await writeFile(
    path.join(repoA, ".track", "state.yaml"),
    yaml.replace("blocked_reason: null", 'blocked_reason: "waiting on review"').replace("health: yellow", "health: red"),
    "utf8"
  );
  await writeFile(
    path.join(repoB, ".track", "state.yaml"),
    yaml.replace("Track Demo", "Repo B").replace("health: yellow", "health: green").replace(
      "flags:\n  - id: flag-001\n    level: yellow\n    title: MCP layer not implemented yet\n    detail: \"The plugin works locally but is not yet wired into agent tool adapters.\"",
      "flags: []"
    ),
    "utf8"
  );

  const entries = await scanPitwall(tempRoot, { now: new Date("2026-04-05T10:40:00+09:00") });
  const output = renderPitwallQueue(tempRoot, entries);

  assert.match(output, /Pitwall \/\/ Queue/);
  assert.match(output, /repo-a/);
  assert.match(output, /repo-b/);
  assert.match(output, /waiting on review/);
  assert.match(output, /Lock checkpoint weights and event schema/);
});

test("scanPitwall derives stale age and pace metrics", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pitwall-metrics-"));
  const repoA = path.join(tempRoot, "repo-a");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(path.join(repoA, ".track"), { recursive: true });
  await writeFile(path.join(repoA, ".track", "state.yaml"), yaml, "utf8");

  const [entry] = await scanPitwall(tempRoot, { now: new Date("2026-04-05T10:40:00+09:00") });
  assert.equal(entry?.metrics.staleState, "stale");
  assert.equal(entry?.metrics.updateAgeMinutes, 585);
  assert.equal(entry?.metrics.paceDeltaPercent, 13);
});

test("resolvePitwallRepo matches a repo by basename", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pitwall-select-"));
  const repoA = path.join(tempRoot, "repo-a");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(path.join(repoA, ".track"), { recursive: true });
  await writeFile(path.join(repoA, ".track", "state.yaml"), yaml, "utf8");

  const resolved = await resolvePitwallRepo(tempRoot, "repo-a");
  assert.equal(resolved, repoA);
});

test("renderPitwallDetail prints focused project information", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pitwall-detail-"));
  const repoA = path.join(tempRoot, "repo-a");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");
  const roadmap = await readFile(ROADMAP_PATH, "utf8");

  await mkdir(path.join(repoA, ".track"), { recursive: true });
  await writeFile(path.join(repoA, ".track", "state.yaml"), yaml, "utf8");
  await writeFile(path.join(repoA, ".track", "roadmap.yaml"), roadmap, "utf8");

  const detail = await loadPitwallDetail(tempRoot, "repo-a");
  const output = renderPitwallDetail(detail);

  assert.match(output, /Pitwall \/\/ Detail/);
  assert.match(output, /PROJECT  repo-a/);
  assert.match(output, /COURSE/);
  assert.match(output, /TASKS/);
  assert.match(output, /RECENT/);
  assert.match(output, /AGE/);
  assert.match(output, /PACE/);
});

test("renderPitwallOwners prints grouped owner load", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pitwall-owners-"));
  const repoA = path.join(tempRoot, "repo-a");
  const repoB = path.join(tempRoot, "repo-b");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(path.join(repoA, ".track"), { recursive: true });
  await mkdir(path.join(repoB, ".track"), { recursive: true });

  await writeFile(path.join(repoA, ".track", "state.yaml"), yaml, "utf8");
  await writeFile(
    path.join(repoB, ".track", "state.yaml"),
    yaml.replace("Track Demo", "Repo B").replace("owner: human", "owner: codex"),
    "utf8"
  );

  const owners = await loadPitwallOwnerLoad(tempRoot, { now: new Date("2026-04-05T10:40:00+09:00") });
  const output = renderPitwallOwners(tempRoot, owners);

  assert.match(output, /Pitwall \/\/ Owner Load/);
  assert.match(output, /codex/);
  assert.match(output, /ACTIVE/);
});
