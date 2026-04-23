import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpenClawSnapshotFromToolData,
  isOpenClawWorkerSession,
  normalizeProcessEntry,
  normalizeSessionEntry,
} from "../src/openclaw-adapter.js";

test("isOpenClawWorkerSession filters out main chat sessions", () => {
  assert.equal(isOpenClawWorkerSession({ key: "agent:main:telegram:direct:66108222", displayName: "Main chat" }), false);
  assert.equal(isOpenClawWorkerSession({ key: "agent:worker:acp:claude:phase2", displayName: "oc-claude-phase2" }), true);
});

test("normalizeSessionEntry maps OpenClaw session data into worker input", () => {
  const session = normalizeSessionEntry({
    displayName: "oc-claude-phase2-66108222",
    key: "agent:worker:acp:claude:phase2",
    lastMessage: { text: "Waiting for approval to write Documents output" },
    model: "claude-sonnet-4-6",
    sessionId: "sess-1",
    updatedAt: 1776913595505,
  });

  assert.equal(session.id, "sess-1");
  assert.equal(session.runtime, "acp");
  assert.equal(session.lane, "claude");
  assert.equal(session.state, "blocked");
  assert.match(session.blockedReason ?? "", /approval/i);
});

test("normalizeProcessEntry maps exec process data into worker input", () => {
  const processEntry = normalizeProcessEntry({
    command: "acpx claude exec phase2",
    exitCode: 1,
    sessionId: "proc-1",
    startedAt: "2026-04-23T03:11:28.608Z",
    status: "Process exited with code 1",
    updatedAt: "2026-04-23T03:15:00.000Z",
  });

  assert.equal(processEntry.runtime, "acp");
  assert.equal(processEntry.state, "error");
  assert.equal(processEntry.source, "process");
});

test("buildOpenClawSnapshotFromToolData combines session and process sources", () => {
  const snapshot = buildOpenClawSnapshotFromToolData({
    generatedAt: "2026-04-23T03:32:00Z",
    processes: [
      {
        command: "acpx claude exec phase2",
        running: false,
        sessionId: "proc-1",
        status: "Process exited with code 0",
        updatedAt: "2026-04-23T03:20:00.000Z",
      },
    ],
    sessions: [
      {
        displayName: "Main chat",
        key: "agent:main:telegram:direct:66108222",
        sessionId: "main-1",
        updatedAt: 1776913595505,
      },
      {
        displayName: "oc-claude-phase2-66108222",
        key: "agent:worker:acp:claude:phase2",
        lastMessage: { text: "Reading source docs" },
        model: "claude-sonnet-4-6",
        sessionId: "sess-1",
        updatedAt: 1776913596505,
      },
    ],
    workspaceRoot: "/Users/Agent/ps-workspace",
  });

  assert.equal(snapshot.sessions.length, 2);
  assert.equal(snapshot.totals.running, 1);
  assert.equal(snapshot.totals.done, 1);
  assert.deepEqual(
    snapshot.sessions.map((session) => session.id).sort(),
    ["proc-1", "sess-1"]
  );
});
