import type { OpenClawMonitorSnapshot, OpenClawWorkerSession } from "./openclaw-monitor.js";

export interface PitwallMonitorAlert {
  detail: string;
  label: string;
  sessionId: string;
  severity: "red" | "yellow";
  title: string;
}

export interface PitwallMonitorView {
  active: OpenClawWorkerSession[];
  alerts: PitwallMonitorAlert[];
  blocked: OpenClawWorkerSession[];
  completed: OpenClawWorkerSession[];
  errors: OpenClawWorkerSession[];
  generatedAt: string;
  waiting: OpenClawWorkerSession[];
  workspaceRoot: string;
}

export function buildPitwallMonitorView(snapshot: OpenClawMonitorSnapshot): PitwallMonitorView {
  const active = snapshot.sessions.filter((session) => session.status === "running");
  const blocked = snapshot.sessions.filter((session) => session.status === "blocked");
  const completed = snapshot.sessions.filter((session) => session.status === "done");
  const errors = snapshot.sessions.filter((session) => session.status === "error");
  const waiting = snapshot.sessions.filter((session) => session.status === "waiting");

  return {
    active,
    alerts: listPitwallMonitorAlerts(snapshot),
    blocked,
    completed,
    errors,
    generatedAt: snapshot.generatedAt,
    waiting,
    workspaceRoot: snapshot.workspaceRoot,
  };
}

export function listPitwallMonitorAlerts(snapshot: OpenClawMonitorSnapshot): PitwallMonitorAlert[] {
  const alerts: PitwallMonitorAlert[] = [];

  for (const session of snapshot.sessions) {
    if (session.status === "error") {
      alerts.push({
        detail: session.lastMessage ?? "Worker failed and needs operator review.",
        label: session.label,
        sessionId: session.id,
        severity: "red",
        title: "Worker failed",
      });
      continue;
    }

    if (session.status === "blocked") {
      alerts.push({
        detail: session.blockedReason ?? session.lastMessage ?? "Worker is blocked and waiting for input.",
        label: session.label,
        sessionId: session.id,
        severity: "yellow",
        title: "Worker blocked",
      });
    }
  }

  return alerts;
}
