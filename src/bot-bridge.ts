import type { OpenClawMonitorSnapshot } from "./openclaw-monitor.js";
import { buildPitwallMonitorView } from "./pitwall-monitor.js";

export interface MonitorBotCommand {
  command: string;
  description: string;
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

export function renderMonitorAlertMessage(snapshot: OpenClawMonitorSnapshot): string | null {
  const view = buildPitwallMonitorView(snapshot);
  const alert = view.alerts[0];
  if (!alert) {
    return null;
  }

  return `${alert.title}: ${alert.label}\n${alert.detail}`;
}
