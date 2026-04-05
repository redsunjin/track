import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { TrackMCPServer } from "../src/mcp.js";
import { sanitizeInlineText } from "../src/security.js";
import { loadTrackState } from "../src/state.js";

const EXAMPLE_PATH = path.resolve("examples", "track-state.example.yaml");

test("loadTrackState rejects explicit files outside .track", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-security-state-"));
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await writeFile(path.join(tempDir, "state.yaml"), yaml, "utf8");

  await assert.rejects(() => loadTrackState(tempDir, "../state.yaml"), /Track state file must stay inside/);
});

test("TrackMCPServer rejects repo_path outside workspace root", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "track-security-workspace-"));
  const repoRoot = path.join(workspaceRoot, "repo-a");
  const trackDir = path.join(repoRoot, ".track");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(trackDir, { recursive: true });
  await writeFile(path.join(trackDir, "state.yaml"), yaml, "utf8");

  const server = new TrackMCPServer({
    repoRoot,
    workspaceRoot,
  });

  await assert.rejects(
    () =>
      server.handle({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_track_status",
          arguments: {
            repo_path: "/tmp",
          },
        },
      }),
    /Argument 'repo_path' must stay inside/
  );
});

test("sanitizeInlineText strips ansi escapes and control characters", () => {
  const value = sanitizeInlineText("hello\u001b[31m world\nnext\tline");
  assert.equal(value, "hello world next line");
});
