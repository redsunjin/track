import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadOpenClawPitwallResult,
  renderOpenClawPitwall,
  resolveOpenClawPitwallFilter,
} from "../src/openclaw-pitwall.js";

test("OpenClaw Pitwall loader handles a missing default source as an empty board", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "track-openclaw-missing-"));
  const result = await loadOpenClawPitwallResult({ workspaceRoot });

  assert.equal(result.sourceFound, false);
  assert.equal(result.snapshot.sessions.length, 0);
  assert.match(renderOpenClawPitwall(result, { color: false }), /NO OPENCLAW SOURCE FOUND/);
});

test("OpenClaw Pitwall loader renders filtered worker views from tool data", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "track-openclaw-"));
  const sourceFile = path.join(workspaceRoot, "workers.json");
  await writeFile(
    sourceFile,
    JSON.stringify(
      {
        generatedAt: "2026-04-23T10:00:00Z",
        processes: [
          {
            command: "acpx claude exec phase3",
            exitCode: 2,
            lastOutput: "Process exited with code 2",
            sessionId: "proc-1",
            updatedAt: "2026-04-23T09:59:00Z",
          },
        ],
        sessions: [
          {
            displayName: "Main chat",
            key: "agent:main:telegram:direct:1",
            sessionId: "main-1",
            updatedAt: "2026-04-23T09:55:00Z",
          },
          {
            displayName: "oc-claude-phase2",
            key: "agent:worker:acp:claude:phase2",
            lastMessage: { text: "Waiting for approval to write output" },
            sessionId: "sess-1",
            updatedAt: "2026-04-23T09:58:00Z",
          },
        ],
      },
      null,
      2
    )
  );

  const blocked = await loadOpenClawPitwallResult({
    filter: "blocked",
    sourceFile,
    workspaceRoot,
  });
  assert.equal(blocked.sourceFound, true);
  assert.equal(blocked.workers.length, 1);
  assert.equal(blocked.workers[0]?.status, "blocked");

  const rendered = renderOpenClawPitwall(blocked, { color: false });
  assert.match(rendered, /Pitwall \/\/ OpenClaw Workers/);
  assert.match(rendered, /FILTER   BLOCKED/);
  assert.match(rendered, /oc-claude-phase2/);
  assert.doesNotMatch(rendered, /Main chat/);

  const errors = await loadOpenClawPitwallResult({
    filter: "errors",
    sourceFile,
    workspaceRoot,
  });
  assert.equal(errors.workers.length, 1);
  assert.equal(errors.workers[0]?.status, "error");
});

test("OpenClaw Pitwall filter flags are mutually exclusive", () => {
  assert.equal(resolveOpenClawPitwallFilter(["--blocked"]), "blocked");
  assert.equal(resolveOpenClawPitwallFilter(["--errors"]), "errors");
  assert.equal(resolveOpenClawPitwallFilter(["--running"]), "running");
  assert.throws(() => resolveOpenClawPitwallFilter(["--blocked", "--errors"]), /only one/);
});
