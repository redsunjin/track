export type OpenClawRuntimeKind = "acp" | "exec" | "main" | "other";
export type OpenClawWorkerState = "running" | "done" | "blocked" | "error" | "waiting";
export type OpenClawSignal = "green" | "yellow" | "red" | "blue";

export interface OpenClawWorkerInput {
  id: string;
  label: string;
  blockedReason?: string | null;
  completedAt?: string | null;
  exitCode?: number | null;
  hasPendingApproval?: boolean;
  hasRecentError?: boolean;
  lane?: string | null;
  lastMessage?: string | null;
  lastTool?: string | null;
  model?: string | null;
  runtime?: OpenClawRuntimeKind;
  source?: "session" | "process";
  startedAt?: string | null;
  state?: string | null;
  updatedAt?: string | null;
}

export interface OpenClawWorkerSession {
  id: string;
  label: string;
  blockedReason: string | null;
  lane: string | null;
  lastMessage: string | null;
  lastTool: string | null;
  model: string | null;
  runtime: OpenClawRuntimeKind;
  signal: OpenClawSignal;
  source: "session" | "process";
  startedAt: string | null;
  status: OpenClawWorkerState;
  updatedAt: string | null;
}

export interface OpenClawMonitorSnapshot {
  generatedAt: string;
  sessions: OpenClawWorkerSession[];
  totals: Record<OpenClawWorkerState, number>;
  workspaceRoot: string;
}

const STATUS_ALIASES: Record<string, OpenClawWorkerState> = {
  active: "running",
  blocked: "blocked",
  complete: "done",
  completed: "done",
  done: "done",
  error: "error",
  failed: "error",
  failure: "error",
  idle: "waiting",
  pending: "waiting",
  running: "running",
  wait: "waiting",
  waiting: "waiting",
};

export function deriveOpenClawWorkerStatus(input: OpenClawWorkerInput): OpenClawWorkerState {
  const explicit = normalizeStatus(input.state);
  if (explicit) {
    return explicit;
  }

  if (input.hasRecentError || (typeof input.exitCode === "number" && input.exitCode > 0)) {
    return "error";
  }

  if (input.hasPendingApproval || input.blockedReason) {
    return "blocked";
  }

  if (input.completedAt || input.exitCode === 0) {
    return "done";
  }

  if (input.updatedAt || input.startedAt) {
    return "running";
  }

  return "waiting";
}

export function toOpenClawWorkerSession(input: OpenClawWorkerInput): OpenClawWorkerSession {
  const status = deriveOpenClawWorkerStatus(input);

  return {
    id: input.id,
    label: input.label,
    blockedReason: input.blockedReason?.trim() || null,
    lane: input.lane?.trim() || null,
    lastMessage: normalizeText(input.lastMessage),
    lastTool: normalizeText(input.lastTool),
    model: input.model?.trim() || null,
    runtime: input.runtime ?? "other",
    signal: statusToSignal(status),
    source: input.source ?? "session",
    startedAt: normalizeTimestamp(input.startedAt),
    status,
    updatedAt: normalizeTimestamp(input.updatedAt ?? input.completedAt),
  };
}

export function buildOpenClawMonitorSnapshot(input: {
  generatedAt?: Date | string;
  sessions: OpenClawWorkerInput[];
  workspaceRoot: string;
}): OpenClawMonitorSnapshot {
  const sessions = input.sessions.map(toOpenClawWorkerSession).sort(compareSessionsByActivity);
  const totals: Record<OpenClawWorkerState, number> = {
    blocked: 0,
    done: 0,
    error: 0,
    running: 0,
    waiting: 0,
  };

  for (const session of sessions) {
    totals[session.status] += 1;
  }

  return {
    generatedAt: normalizeGeneratedAt(input.generatedAt),
    sessions,
    totals,
    workspaceRoot: input.workspaceRoot,
  };
}

function compareSessionsByActivity(left: OpenClawWorkerSession, right: OpenClawWorkerSession): number {
  const leftTime = timestampToMs(left.updatedAt ?? left.startedAt);
  const rightTime = timestampToMs(right.updatedAt ?? right.startedAt);
  return rightTime - leftTime;
}

function normalizeGeneratedAt(value?: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return normalizeTimestamp(value) ?? new Date(value).toISOString();
  }

  return new Date().toISOString();
}

function normalizeStatus(value?: string | null): OpenClawWorkerState | null {
  if (!value) {
    return null;
  }

  return STATUS_ALIASES[value.trim().toLowerCase()] ?? null;
}

function normalizeText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTimestamp(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function statusToSignal(status: OpenClawWorkerState): OpenClawSignal {
  switch (status) {
    case "running":
      return "green";
    case "done":
      return "blue";
    case "blocked":
      return "yellow";
    case "error":
      return "red";
    case "waiting":
    default:
      return "blue";
  }
}

function timestampToMs(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
