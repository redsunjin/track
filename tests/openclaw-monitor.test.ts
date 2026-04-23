import assert from "node:assert/strict";
import test from "node:test";

import { renderMonitorAlertMessage, renderMonitorBotSummary } from "../src/bot-bridge.js";
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
