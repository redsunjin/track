import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { captureOpenClawTelemetry, renderOpenClawCaptureSummary } from "../src/openclaw-live.js";

test("OpenClaw capture writes normalized monitor output from a combined source", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "track-openclaw-capture-"));
  const sourceFile = path.join(workspaceRoot, "raw-openclaw.json");
  await writeFile(
    sourceFile,
    JSON.stringify(
      {
        generatedAt: "2026-04-23T12:00:00Z",
        processes: [
          {
            command: "acpx claude exec phase3",
            exitCode: 2,
            sessionId: "proc-1",
            status: "Process exited with code 2",
            updatedAt: "2026-04-23T11:58:00Z",
          },
        ],
        sessions: [
          {
            displayName: "Main chat",
            key: "agent:main:telegram:direct:1",
            sessionId: "main-1",
            updatedAt: "2026-04-23T11:55:00Z",
          },
          {
            displayName: "oc-claude-phase2",
            key: "agent:worker:acp:claude:phase2",
            lastMessage: { text: "Waiting for approval to write output" },
            sessionId: "sess-1",
            updatedAt: "2026-04-23T11:59:00Z",
          },
        ],
      },
      null,
      2
    )
  );

  const result = await captureOpenClawTelemetry({ sourceFile, workspaceRoot });
  const written = JSON.parse(await readFile(result.outputPath, "utf8"));

  assert.equal(result.wrote, true);
  assert.equal(result.outputPath, path.join(workspaceRoot, ".track", "openclaw-monitor.json"));
  assert.equal(result.snapshot.sessions.length, 2);
  assert.equal(result.snapshot.totals.blocked, 1);
  assert.equal(result.snapshot.totals.error, 1);
  assert.equal(written.sessions.length, 2);
  assert.deepEqual(
    written.sessions.map((session: { id: string }) => session.id).sort(),
    ["proc-1", "sess-1"]
  );
  assert.match(renderOpenClawCaptureSummary(result), /OPENCLAW CAPTURE OK/);
});

test("OpenClaw capture supports separate sessions and processes files without writing", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "track-openclaw-capture-split-"));
  const sessionsFile = path.join(workspaceRoot, "sessions.json");
  const processesFile = path.join(workspaceRoot, "processes.json");
  await writeFile(
    sessionsFile,
    JSON.stringify([
      {
        displayName: "oc-codex-phase4",
        key: "agent:worker:acp:codex:phase4",
        lastMessage: { text: "Reading source docs" },
        sessionId: "sess-4",
        updatedAt: "2026-04-23T12:10:00Z",
      },
    ])
  );
  await writeFile(
    processesFile,
    JSON.stringify({
      processes: [
        {
          command: "acpx gemini exec phase5",
          running: false,
          sessionId: "proc-5",
          status: "Process exited with code 0",
          updatedAt: "2026-04-23T12:11:00Z",
        },
      ],
    })
  );

  const result = await captureOpenClawTelemetry({
    outputFile: ".track/openclaw-monitor.json",
    processesFile,
    sessionsFile,
    workspaceRoot,
    write: false,
  });

  assert.equal(result.wrote, false);
  assert.equal(result.snapshot.sessions.length, 2);
  assert.equal(result.snapshot.totals.running, 1);
  assert.equal(result.snapshot.totals.done, 1);
  await assert.rejects(() => access(result.outputPath));
  assert.match(renderOpenClawCaptureSummary(result), /OPENCLAW CAPTURE DRY-RUN/);
});

test("OpenClaw capture requires a single source mode", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "track-openclaw-capture-invalid-"));

  await assert.rejects(() => captureOpenClawTelemetry({ workspaceRoot }), /requires --source/);
  await assert.rejects(
    () => captureOpenClawTelemetry({ processesFile: "processes.json", sourceFile: "raw.json", workspaceRoot }),
    /either --source or --sessions\/--processes/
  );
});
