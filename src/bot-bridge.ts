import type { OpenClawMonitorSnapshot, OpenClawWorkerSession } from "./openclaw-monitor.js";
import { buildPitwallMonitorView } from "./pitwall-monitor.js";
import { sanitizeInlineText } from "./security.js";

export interface MonitorBotCommand {
  command: string;
  description: string;
}

export type MonitorBotPushKind = "approval_needed" | "blocked" | "completed" | "failed";
export type MonitorBotPushSeverity = "blue" | "red" | "yellow";

export interface MonitorBotPushEvent {
  createdAt: string;
  dedupeKey: string;
  detail: string;
  kind: MonitorBotPushKind;
  label: string;
  message: string;
  recommendedCommand: string;
  sessionId: string;
  severity: MonitorBotPushSeverity;
  title: string;
}

export interface MonitorBotPushOptions {
  generatedAt?: Date | string;
  includeCompleted?: boolean;
  previousSnapshot?: OpenClawMonitorSnapshot;
}

export function listMonitorBotCommands(): MonitorBotCommand[] {
  return [
    { command: "워커 목록", description: "전체 워커 상태 요약" },
    { command: "에러 세션만", description: "실패한 세션만 필터링" },
    { command: "막힌 세션", description: "blocked 상태 세션 확인" },
    { command: "<세션명> 최근 로그", description: "특정 세션의 최근 상태 질의" },
  ];
}

export function renderMonitorBotSummary(
  snapshot: OpenClawMonitorSnapshot,
  options: {
    includeCompleted?: boolean;
    maxItems?: number;
  } = {}
): string {
  const view = buildPitwallMonitorView(snapshot);
  const maxItems = options.maxItems ?? 3;
  const lines = [
    `워커 현황 ${view.active.length} running, ${view.blocked.length} blocked, ${view.errors.length} error, ${view.waiting.length} waiting`,
  ];

  const focusSessions = [...view.errors, ...view.blocked, ...view.active].slice(0, maxItems);
  for (const session of focusSessions) {
    lines.push(`- ${session.label} [${session.status}] ${session.blockedReason ?? session.lastMessage ?? "상세 로그 확인"}`);
  }

  if (options.includeCompleted && view.completed.length > 0) {
    for (const session of view.completed.slice(0, maxItems)) {
      lines.push(`- ${session.label} [done] ${session.lastMessage ?? "완료"}`);
    }
  }

  return lines.join("\n");
}

export function buildMonitorBotPushEvents(
  snapshot: OpenClawMonitorSnapshot,
  options: MonitorBotPushOptions = {}
): MonitorBotPushEvent[] {
  const previousById = new Map(options.previousSnapshot?.sessions.map((session) => [session.id, session]));
  const createdAt = normalizePushCreatedAt(options.generatedAt ?? snapshot.generatedAt);
  const events: MonitorBotPushEvent[] = [];

  for (const session of snapshot.sessions) {
    const kind = classifyPushKind(session, options.includeCompleted ?? false);
    if (!kind) {
      continue;
    }

    const previousKind = classifyPreviousPushKind(previousById.get(session.id), options.includeCompleted ?? false);
    if (previousKind === kind) {
      continue;
    }

    events.push(toMonitorBotPushEvent(session, kind, createdAt));
  }

  return events;
}

export function renderMonitorBotPushMessage(event: MonitorBotPushEvent): string {
  return [
    `[${event.severity.toUpperCase()}] ${sanitizeInlineText(event.title)}: ${sanitizeInlineText(event.label)}`,
    sanitizeInlineText(event.detail),
    `Command: ${sanitizeInlineText(event.recommendedCommand)}`,
    `Dedupe: ${sanitizeInlineText(event.dedupeKey)}`,
  ].join("\n");
}

export function renderMonitorBotPushBatch(events: MonitorBotPushEvent[]): string {
  if (events.length === 0) {
    return ["BOT PUSH QUEUE CLEAR", "EVENTS   0", "No OpenClaw bot push events."].join("\n");
  }

  const lines = ["BOT PUSH EVENTS", `EVENTS   ${events.length}`];
  for (const event of events) {
    lines.push("");
    lines.push(renderMonitorBotPushMessage(event));
  }
  return lines.join("\n");
}

export function renderMonitorAlertMessage(snapshot: OpenClawMonitorSnapshot): string | null {
  const view = buildPitwallMonitorView(snapshot);
  const alert = view.alerts[0];
  if (!alert) {
    return null;
  }

  return `${alert.title}: ${alert.label}\n${alert.detail}`;
}

function classifyPreviousPushKind(
  session: OpenClawWorkerSession | undefined,
  includeCompleted: boolean
): MonitorBotPushKind | null {
  return session ? classifyPushKind(session, includeCompleted) : null;
}

function classifyPushKind(session: OpenClawWorkerSession, includeCompleted: boolean): MonitorBotPushKind | null {
  if (session.status === "error") {
    return "failed";
  }

  if (session.status === "blocked") {
    return isApprovalNeeded(session) ? "approval_needed" : "blocked";
  }

  if (includeCompleted && session.status === "done") {
    return "completed";
  }

  return null;
}

function toMonitorBotPushEvent(
  session: OpenClawWorkerSession,
  kind: MonitorBotPushKind,
  createdAt: string
): MonitorBotPushEvent {
  const detail = eventDetail(session, kind);
  return {
    createdAt,
    dedupeKey: [
      "openclaw",
      kind,
      session.id,
      session.status,
      session.updatedAt ?? session.startedAt ?? createdAt,
    ].join(":"),
    detail,
    kind,
    label: session.label,
    message: `${eventTitle(kind)}: ${session.label}`,
    recommendedCommand: recommendedCommandForKind(kind),
    sessionId: session.id,
    severity: eventSeverity(kind),
    title: eventTitle(kind),
  };
}

function eventDetail(session: OpenClawWorkerSession, kind: MonitorBotPushKind): string {
  const fallback = {
    approval_needed: "Worker needs approval before it can continue.",
    blocked: "Worker is blocked and waiting for operator input.",
    completed: "Worker completed successfully.",
    failed: "Worker failed and needs operator review.",
  } satisfies Record<MonitorBotPushKind, string>;

  return session.blockedReason ?? session.lastMessage ?? fallback[kind];
}

function eventSeverity(kind: MonitorBotPushKind): MonitorBotPushSeverity {
  if (kind === "failed") {
    return "red";
  }
  if (kind === "completed") {
    return "blue";
  }
  return "yellow";
}

function eventTitle(kind: MonitorBotPushKind): string {
  switch (kind) {
    case "approval_needed":
      return "Approval needed";
    case "blocked":
      return "Worker blocked";
    case "completed":
      return "Worker completed";
    case "failed":
      return "Worker failed";
  }
}

function recommendedCommandForKind(kind: MonitorBotPushKind): string {
  switch (kind) {
    case "approval_needed":
    case "blocked":
      return "track pitwall --openclaw --blocked";
    case "completed":
      return "track pitwall --openclaw";
    case "failed":
      return "track pitwall --openclaw --errors";
  }
}

function isApprovalNeeded(session: OpenClawWorkerSession): boolean {
  return containsApprovalSignal(session.blockedReason) || containsApprovalSignal(session.lastMessage);
}

function containsApprovalSignal(value: string | null): boolean {
  return /approval|approve|permission|confirm|승인|허가|확인/i.test(value ?? "");
}

function normalizePushCreatedAt(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}
