import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { createPalette, padVisible, type RenderOptions } from "./ansi.js";
import {
  buildOpenClawSnapshotFromToolData,
  type BuildOpenClawSnapshotFromToolDataInput,
} from "./openclaw-adapter.js";
import { buildOpenClawMonitorSnapshot, type OpenClawMonitorSnapshot, type OpenClawWorkerSession } from "./openclaw-monitor.js";
import { buildPitwallMonitorView, type PitwallMonitorView } from "./pitwall-monitor.js";
import { sanitizeInlineText } from "./security.js";

export type OpenClawPitwallFilter = "all" | "blocked" | "errors" | "running";

export interface OpenClawPitwallLoadOptions {
  filter?: OpenClawPitwallFilter;
  generatedAt?: Date | string;
  includeMainSessions?: boolean;
  sourceFile?: string;
  workspaceRoot: string;
}

export interface OpenClawPitwallResult {
  filter: OpenClawPitwallFilter;
  snapshot: OpenClawMonitorSnapshot;
  sourceFound: boolean;
  sourcePath: string;
  view: PitwallMonitorView;
  workers: OpenClawWorkerSession[];
}

const DEFAULT_OPENCLAW_SOURCE = path.join(".track", "openclaw-monitor.json");

export async function loadOpenClawPitwallResult(options: OpenClawPitwallLoadOptions): Promise<OpenClawPitwallResult> {
  const filter = options.filter ?? "all";
  const sourcePath = resolveOpenClawSourcePath(options.workspaceRoot, options.sourceFile);
  const sourceFound = await exists(sourcePath);
  const snapshot = sourceFound
    ? parseOpenClawSource(
        await readFile(sourcePath, "utf8"),
        options.workspaceRoot,
        options.includeMainSessions,
        options.generatedAt
      )
    : buildOpenClawMonitorSnapshot({
        generatedAt: options.generatedAt,
        sessions: [],
        workspaceRoot: options.workspaceRoot,
      });
  const view = buildPitwallMonitorView(snapshot);

  return {
    filter,
    snapshot,
    sourceFound,
    sourcePath,
    view,
    workers: filterOpenClawWorkers(view, filter),
  };
}

export function resolveOpenClawPitwallFilter(args: string[]): OpenClawPitwallFilter {
  const filters: OpenClawPitwallFilter[] = [];
  if (args.includes("--blocked")) {
    filters.push("blocked");
  }
  if (args.includes("--errors")) {
    filters.push("errors");
  }
  if (args.includes("--running")) {
    filters.push("running");
  }

  if (filters.length > 1) {
    throw new Error("OpenClaw Pitwall accepts only one of --blocked, --errors, or --running.");
  }

  return filters[0] ?? "all";
}

export function renderOpenClawPitwall(result: OpenClawPitwallResult, options?: RenderOptions): string {
  const palette = createPalette(options);
  const totals = result.snapshot.totals;
  const lines = [
    palette.header("Pitwall // OpenClaw Workers"),
    palette.divider(divider()),
    `ROOT     ${sanitizeInlineText(result.snapshot.workspaceRoot, ".")}`,
    `SOURCE   ${sanitizeInlineText(path.relative(result.snapshot.workspaceRoot, result.sourcePath) || result.sourcePath, ".")}`,
    `FILTER   ${result.filter.toUpperCase()}`,
    `BOARD    RUNNING ${palette.success(String(totals.running))}  BLOCKED ${palette.caution(
      String(totals.blocked)
    )}  ERROR ${palette.danger(String(totals.error))}  DONE ${palette.info(String(totals.done))}  WAITING ${palette.muted(
      String(totals.waiting)
    )}`,
    palette.divider(divider()),
  ];

  if (!result.sourceFound) {
    lines.push(palette.caution("NO OPENCLAW SOURCE FOUND"));
    lines.push(palette.muted("Pass --source <file> or create .track/openclaw-monitor.json."));
    return lines.join("\n");
  }

  if (result.workers.length === 0) {
    lines.push(palette.muted("NO OPENCLAW WORKERS MATCH FILTER"));
    return lines.join("\n");
  }

  if (result.filter === "all") {
    appendAlertSection(lines, result.view, palette);
    appendWorkerSection(lines, "ACTIVE", result.view.active, palette);
    appendWorkerSection(lines, "BLOCKED", result.view.blocked, palette);
    appendWorkerSection(lines, "ERRORS", result.view.errors, palette);
    appendWorkerSection(lines, "WAITING", result.view.waiting, palette);
    appendWorkerSection(lines, "COMPLETED", result.view.completed, palette);
    return lines.join("\n");
  }

  appendWorkerSection(lines, sectionTitleForFilter(result.filter), result.workers, palette);
  return lines.join("\n");
}

export function filterOpenClawWorkers(
  view: PitwallMonitorView,
  filter: OpenClawPitwallFilter
): OpenClawWorkerSession[] {
  switch (filter) {
    case "blocked":
      return view.blocked;
    case "errors":
      return view.errors;
    case "running":
      return view.active;
    case "all":
    default:
      return [...view.active, ...view.blocked, ...view.errors, ...view.waiting, ...view.completed];
  }
}

function parseOpenClawSource(
  raw: string,
  workspaceRoot: string,
  includeMainSessions = false,
  generatedAt?: Date | string
): OpenClawMonitorSnapshot {
  const parsed = JSON.parse(raw) as Partial<BuildOpenClawSnapshotFromToolDataInput & OpenClawMonitorSnapshot>;

  if (Array.isArray(parsed.sessions) && parsed.totals) {
    return {
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString(),
      sessions: parsed.sessions as OpenClawWorkerSession[],
      totals: parsed.totals as OpenClawMonitorSnapshot["totals"],
      workspaceRoot: parsed.workspaceRoot ?? workspaceRoot,
    };
  }

  return buildOpenClawSnapshotFromToolData({
    generatedAt: parsed.generatedAt ?? generatedAt,
    includeMainSessions,
    processes: parsed.processes,
    sessions: parsed.sessions,
    workspaceRoot: parsed.workspaceRoot ?? workspaceRoot,
  });
}

function resolveOpenClawSourcePath(workspaceRoot: string, sourceFile?: string): string {
  return path.resolve(workspaceRoot, sourceFile ?? DEFAULT_OPENCLAW_SOURCE);
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function appendAlertSection(
  lines: string[],
  view: PitwallMonitorView,
  palette: ReturnType<typeof createPalette>
): void {
  if (!view.alerts.length) {
    return;
  }

  lines.push(palette.header("ALERTS"));
  for (const alert of view.alerts) {
    const color = alert.severity === "red" ? palette.danger : palette.caution;
    lines.push(
      `${color(pad(alert.severity.toUpperCase(), 7))} ${sanitizeInlineText(alert.label, "worker")} :: ${sanitizeInlineText(
        alert.detail,
        "Needs review"
      )}`
    );
  }
  lines.push(palette.divider(divider()));
}

function appendWorkerSection(
  lines: string[],
  title: string,
  workers: OpenClawWorkerSession[],
  palette: ReturnType<typeof createPalette>
): void {
  if (!workers.length) {
    return;
  }

  lines.push(palette.header(title));
  lines.push(palette.header("SIGNAL  SRC      LANE      WORKER                         LAST MESSAGE"));
  for (const worker of workers) {
    const signal = colorSignal(worker.signal, pad(worker.signal.toUpperCase(), 7), palette);
    const lane = sanitizeInlineText(worker.lane ?? worker.runtime, worker.runtime);
    const label = sanitizeInlineText(worker.label, worker.id);
    const message = sanitizeInlineText(worker.blockedReason ?? worker.lastMessage ?? worker.updatedAt ?? "No status message");
    lines.push(
      `${signal} ${pad(worker.source.toUpperCase(), 8)} ${pad(lane, 9)} ${padVisible(label, 30)} ${message}`
    );
  }
  lines.push(palette.divider(divider()));
}

function sectionTitleForFilter(filter: Exclude<OpenClawPitwallFilter, "all">): string {
  if (filter === "blocked") {
    return "BLOCKED";
  }
  if (filter === "errors") {
    return "ERRORS";
  }
  return "ACTIVE";
}

function colorSignal(
  signal: OpenClawWorkerSession["signal"],
  value: string,
  palette: ReturnType<typeof createPalette>
): string {
  if (signal === "red") {
    return palette.danger(value);
  }
  if (signal === "yellow") {
    return palette.caution(value);
  }
  if (signal === "green") {
    return palette.success(value);
  }
  return palette.info(value);
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}

function divider(): string {
  return "--------------------------------------------------------------------------";
}
