import { buildOpenClawMonitorSnapshot, type OpenClawMonitorSnapshot, type OpenClawRuntimeKind, type OpenClawWorkerInput } from "./openclaw-monitor.js";

export interface OpenClawSessionListMessage {
  body?: string;
  content?: string;
  role?: string;
  text?: string;
}

export interface OpenClawSessionListEntry {
  agentId?: string;
  channel?: string;
  deliveryContext?: {
    channel?: string;
    to?: string;
  };
  displayName?: string;
  key?: string;
  kind?: string;
  lastMessage?: OpenClawSessionListMessage | string;
  lastMessages?: OpenClawSessionListMessage[];
  model?: string;
  runtime?: string;
  sessionId?: string;
  updatedAt?: number | string;
}

export interface OpenClawProcessListEntry {
  command?: string;
  exitCode?: number | null;
  id?: string;
  lastOutput?: string;
  pid?: number;
  running?: boolean;
  sessionId?: string;
  startedAt?: number | string;
  state?: string;
  status?: string;
  updatedAt?: number | string;
}

export interface BuildOpenClawSnapshotFromToolDataInput {
  generatedAt?: Date | string;
  includeMainSessions?: boolean;
  processes?: OpenClawProcessListEntry[];
  sessions?: OpenClawSessionListEntry[];
  workspaceRoot: string;
}

export function buildOpenClawSnapshotFromToolData(input: BuildOpenClawSnapshotFromToolDataInput): OpenClawMonitorSnapshot {
  const sessions = input.sessions ?? [];
  const processes = input.processes ?? [];
  const includeMainSessions = input.includeMainSessions ?? false;

  return buildOpenClawMonitorSnapshot({
    generatedAt: input.generatedAt,
    sessions: [
      ...sessions
        .filter((entry) => includeMainSessions || isOpenClawWorkerSession(entry))
        .map((entry) => normalizeSessionEntry(entry)),
      ...processes.map((entry) => normalizeProcessEntry(entry)),
    ],
    workspaceRoot: input.workspaceRoot,
  });
}

export function isOpenClawWorkerSession(entry: OpenClawSessionListEntry): boolean {
  const text = [entry.key, entry.displayName, entry.runtime, entry.agentId, entry.kind].filter(Boolean).join(" ").toLowerCase();
  if (!text) {
    return false;
  }

  if (text.includes("agent:main:")) {
    return false;
  }

  return ["acp", "subagent", "worker", "claude", "codex", "gemini", "pi", "opencode"].some((token) => text.includes(token));
}

export function normalizeSessionEntry(entry: OpenClawSessionListEntry): OpenClawWorkerInput {
  const id = entry.sessionId ?? entry.key ?? entry.displayName ?? "unknown-session";
  const key = entry.key ?? "";
  const displayName = entry.displayName?.trim();
  const runtime = deriveRuntimeFromSession(entry);
  const lastMessage = normalizeSessionMessage(entry.lastMessage) ?? normalizeSessionMessage(entry.lastMessages?.[0]);
  const stateText = [lastMessage, displayName, key].filter(Boolean).join(" ").toLowerCase();

  return {
    id,
    label: displayName || key || id,
    blockedReason: extractBlockedReason(lastMessage),
    hasPendingApproval: stateText.includes("approval") || stateText.includes("approve") || stateText.includes("permission"),
    hasRecentError: /(failed|error|exited with code|crash|exception)/i.test(lastMessage ?? ""),
    lane: deriveLaneFromText([entry.agentId, entry.runtime, displayName, key]),
    lastMessage,
    model: entry.model?.trim() || null,
    runtime,
    source: "session",
    startedAt: null,
    state: deriveSessionState(entry, lastMessage),
    updatedAt: normalizeUnknownTimestamp(entry.updatedAt),
  };
}

export function normalizeProcessEntry(entry: OpenClawProcessListEntry): OpenClawWorkerInput {
  const id = entry.sessionId ?? entry.id ?? (typeof entry.pid === "number" ? `pid:${entry.pid}` : "unknown-process");
  const command = entry.command?.trim() || id;
  const statusText = [entry.status, entry.state, entry.lastOutput, command].filter(Boolean).join(" ");

  return {
    id,
    label: command,
    blockedReason: extractBlockedReason(statusText),
    completedAt:
      entry.running === false && (entry.exitCode === 0 || /done|completed|finished|code 0/i.test(`${entry.status ?? entry.state ?? ""}`))
        ? normalizeUnknownTimestamp(entry.updatedAt ?? entry.startedAt)
        : null,
    exitCode: typeof entry.exitCode === "number" ? entry.exitCode : null,
    hasPendingApproval: /approval|approve|permission/i.test(statusText),
    hasRecentError: /failed|error|exited with code|exception|sigterm|killed/i.test(statusText),
    lane: deriveLaneFromText([command]),
    lastMessage: entry.lastOutput?.trim() || null,
    runtime: deriveRuntimeFromProcess(entry),
    source: "process",
    startedAt: normalizeUnknownTimestamp(entry.startedAt),
    state: deriveProcessState(entry),
    updatedAt: normalizeUnknownTimestamp(entry.updatedAt),
  };
}

function deriveRuntimeFromSession(entry: OpenClawSessionListEntry): OpenClawRuntimeKind {
  const text = [entry.key, entry.displayName, entry.runtime, entry.agentId].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("acp")) {
    return "acp";
  }
  if (text.includes("main")) {
    return "main";
  }
  return "other";
}

function deriveRuntimeFromProcess(entry: OpenClawProcessListEntry): OpenClawRuntimeKind {
  const text = [entry.command, entry.status, entry.state].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("acpx") || text.includes("claude-agent-acp") || text.includes("acp")) {
    return "acp";
  }
  return "exec";
}

function deriveSessionState(entry: OpenClawSessionListEntry, lastMessage: string | null): string | null {
  const text = [entry.kind, entry.runtime, lastMessage].filter(Boolean).join(" ").toLowerCase();
  if (/failed|error|exception/.test(text)) {
    return "error";
  }
  if (/approval|approve|permission|blocked|waiting/.test(text)) {
    return "blocked";
  }
  if (/done|completed|finished/.test(text)) {
    return "done";
  }
  return entry.updatedAt ? "running" : null;
}

function deriveProcessState(entry: OpenClawProcessListEntry): string | null {
  const text = [entry.status, entry.state, entry.lastOutput].filter(Boolean).join(" ").toLowerCase();
  if (typeof entry.exitCode === "number") {
    return entry.exitCode === 0 ? "done" : "error";
  }
  if (entry.running === true) {
    if (/approval|approve|permission|blocked|waiting/.test(text)) {
      return "blocked";
    }
    return "running";
  }
  if (/done|completed|finished|code 0/.test(text)) {
    return "done";
  }
  if (/failed|error|sigterm|killed|exception|code [1-9]/.test(text)) {
    return "error";
  }
  return entry.running === false ? "waiting" : null;
}

function deriveLaneFromText(values: Array<string | undefined>): string | null {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (text.includes("claude")) {
    return "claude";
  }
  if (text.includes("codex")) {
    return "codex";
  }
  if (text.includes("gemini")) {
    return "gemini";
  }
  if (text.includes("pi")) {
    return "pi";
  }
  if (text.includes("opencode")) {
    return "opencode";
  }
  return null;
}

function extractBlockedReason(text?: string | null): string | null {
  if (!text) {
    return null;
  }
  const normalized = text.trim();
  if (!/approval|approve|permission|blocked|waiting/i.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeSessionMessage(message?: OpenClawSessionListMessage | string | null): string | null {
  if (!message) {
    return null;
  }
  if (typeof message === "string") {
    return message.trim() || null;
  }
  return message.text?.trim() || message.body?.trim() || message.content?.trim() || null;
}

function normalizeUnknownTimestamp(value?: string | number | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}
