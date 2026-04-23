import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonitorBotPushEvents,
  renderMonitorAlertMessage,
  renderMonitorBotPushBatch,
  renderMonitorBotSummary,
} from "../src/bot-bridge.js";
import { buildOpenClawMonitorSnapshot, deriveOpenClawWorkerStatus } from "../src/openclaw-monitor.js";
import { buildPitwallMonitorView } from "../src/pitwall-monitor.js";

test("deriveOpenClawWorkerStatus prioritizes error and blocked states", () => {
  assert.equal(deriveOpenClawWorkerStatus({ id: "1", label: "worker", hasRecentError: true }), "error");
  assert.equal(
    deriveOpenClawWorkerStatus({ id: "2", label: "worker", blockedReason: "approval needed", updatedAt: "2026-04-23T03:00:00Z" }),
    "blocked"
  );
  assert.equal(deriveOpenClawWorkerStatus({ id: "3", label: "worker", completedAt: "2026-04-23T03:00:00Z" }), "done");
});

test("buildOpenClawMonitorSnapshot groups sessions by state", () => {
  const snapshot = buildOpenClawMonitorSnapshot({
    generatedAt: "2026-04-23T03:30:00Z",
    sessions: [
      { id: "a", label: "phase2", runtime: "acp", updatedAt: "2026-04-23T03:25:00Z" },
      { id: "b", label: "phase1", runtime: "exec", blockedReason: "approval needed" },
      { id: "c", label: "cleanup", runtime: "exec", exitCode: 1 },
      { id: "d", label: "done", runtime: "acp", completedAt: "2026-04-23T03:10:00Z" },
    ],
    workspaceRoot: "/tmp/workspace",
  });

  assert.equal(snapshot.totals.running, 1);
  assert.equal(snapshot.totals.blocked, 1);
  assert.equal(snapshot.totals.error, 1);
  assert.equal(snapshot.totals.done, 1);
  assert.equal(snapshot.sessions[0]?.label, "phase2");
});

test("pitwall and bot bridge build operator-friendly summaries", () => {
  const snapshot = buildOpenClawMonitorSnapshot({
    generatedAt: "2026-04-23T03:30:00Z",
    sessions: [
      { id: "a", label: "phase2", runtime: "acp", blockedReason: "documents approval needed" },
      { id: "b", label: "phase3", runtime: "exec", exitCode: 2, lastMessage: "Process exited with code 2." },
      { id: "c", label: "phase4", runtime: "acp", updatedAt: "2026-04-23T03:28:00Z", lastMessage: "Reading source docs" },
    ],
    workspaceRoot: "/tmp/workspace",
  });

  const view = buildPitwallMonitorView(snapshot);
  assert.equal(view.alerts.length, 2);

  const summary = renderMonitorBotSummary(snapshot);
  assert.match(summary, /1 running, 1 blocked, 1 error/);
  assert.match(summary, /phase2/);

  const alert = renderMonitorAlertMessage(snapshot);
  assert.match(alert ?? "", /Worker/);
});

test("bot push hooks emit only actionable OpenClaw state transitions", () => {
  const previous = buildOpenClawMonitorSnapshot({
    generatedAt: "2026-04-23T13:00:00Z",
    sessions: [
      { id: "approval", label: "phase2", runtime: "acp", updatedAt: "2026-04-23T12:59:00Z" },
      { id: "failure", label: "phase3", runtime: "exec", updatedAt: "2026-04-23T12:59:00Z" },
      { id: "blocked", label: "phase4", runtime: "acp", blockedReason: "waiting on files" },
    ],
    workspaceRoot: "/tmp/workspace",
  });
  const current = buildOpenClawMonitorSnapshot({
    generatedAt: "2026-04-23T13:05:00Z",
    sessions: [
      { id: "approval", label: "phase2", runtime: "acp", blockedReason: "approval needed before write" },
      { id: "failure", label: "phase3", runtime: "exec", exitCode: 2, lastMessage: "Process exited with code 2" },
      { id: "done", label: "phase5", runtime: "exec", exitCode: 0, lastMessage: "completed" },
      { id: "blocked", label: "phase4", runtime: "acp", blockedReason: "waiting on files" },
    ],
    workspaceRoot: "/tmp/workspace",
  });

  const events = buildMonitorBotPushEvents(current, {
    generatedAt: "2026-04-23T13:06:00Z",
    includeCompleted: true,
    previousSnapshot: previous,
  });

  assert.deepEqual(
    events.map((event) => event.kind),
    ["approval_needed", "failed", "completed"]
  );
  assert.equal(events[0]?.recommendedCommand, "track pitwall --openclaw --blocked");
  assert.equal(events[1]?.severity, "red");
  assert.match(renderMonitorBotPushBatch(events), /BOT PUSH EVENTS/);
  assert.match(renderMonitorBotPushBatch(events), /Approval needed/);
});

test("bot push hooks skip completed workers unless requested", () => {
  const snapshot = buildOpenClawMonitorSnapshot({
    generatedAt: "2026-04-23T13:10:00Z",
    sessions: [{ id: "done", label: "phase5", runtime: "exec", exitCode: 0 }],
    workspaceRoot: "/tmp/workspace",
  });

  assert.equal(buildMonitorBotPushEvents(snapshot).length, 0);
  assert.equal(buildMonitorBotPushEvents(snapshot, { includeCompleted: true })[0]?.kind, "completed");
  assert.match(renderMonitorBotPushBatch([]), /QUEUE CLEAR/);
});
