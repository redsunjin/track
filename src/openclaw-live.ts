import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildOpenClawSnapshotFromToolData,
  type BuildOpenClawSnapshotFromToolDataInput,
  type OpenClawProcessListEntry,
  type OpenClawSessionListEntry,
} from "./openclaw-adapter.js";
import { type OpenClawMonitorSnapshot, type OpenClawWorkerSession } from "./openclaw-monitor.js";
import { resolveWorkspacePath } from "./security.js";

export interface CaptureOpenClawTelemetryOptions {
  generatedAt?: Date | string;
  includeMainSessions?: boolean;
  outputFile?: string;
  processesFile?: string;
  sessionsFile?: string;
  sourceFile?: string;
  workspaceRoot: string;
  write?: boolean;
}

export interface CaptureOpenClawTelemetryResult {
  outputPath: string;
  snapshot: OpenClawMonitorSnapshot;
  sourcePaths: string[];
  wrote: boolean;
}

const DEFAULT_OPENCLAW_OUTPUT = path.join(".track", "openclaw-monitor.json");

export async function captureOpenClawTelemetry(
  options: CaptureOpenClawTelemetryOptions
): Promise<CaptureOpenClawTelemetryResult> {
  const sourcePaths = await resolveOpenClawCaptureSources(options);
  if (!sourcePaths.length) {
    throw new Error("OpenClaw capture requires --source, --sessions, or --processes.");
  }
  if (options.sourceFile && (options.sessionsFile || options.processesFile)) {
    throw new Error("OpenClaw capture accepts either --source or --sessions/--processes, not both.");
  }

  const snapshot = await buildSnapshotFromCaptureSources(options);
  const outputPath = await resolveCapturePath(options.workspaceRoot, options.outputFile ?? DEFAULT_OPENCLAW_OUTPUT);
  const shouldWrite = options.write ?? true;

  if (shouldWrite) {
    await writeSnapshotAtomically(outputPath, snapshot);
  }

  return {
    outputPath,
    snapshot,
    sourcePaths,
    wrote: shouldWrite,
  };
}

export function renderOpenClawCaptureSummary(result: CaptureOpenClawTelemetryResult): string {
  const totals = result.snapshot.totals;
  return [
    result.wrote ? "OPENCLAW CAPTURE OK" : "OPENCLAW CAPTURE DRY-RUN",
    `OUTPUT   ${result.outputPath}`,
    `SOURCES  ${result.sourcePaths.join(", ")}`,
    `WORKERS  ${result.snapshot.sessions.length}`,
    `BOARD    RUNNING ${totals.running}  BLOCKED ${totals.blocked}  ERROR ${totals.error}  DONE ${totals.done}  WAITING ${totals.waiting}`,
  ].join("\n");
}

async function buildSnapshotFromCaptureSources(options: CaptureOpenClawTelemetryOptions): Promise<OpenClawMonitorSnapshot> {
  if (options.sourceFile) {
    const sourcePath = await resolveCapturePath(options.workspaceRoot, options.sourceFile);
    const raw = await readJson(sourcePath);
    return parseCombinedOpenClawSource(raw, options);
  }

  const sessions = options.sessionsFile
    ? await readArrayFile<OpenClawSessionListEntry>(await resolveCapturePath(options.workspaceRoot, options.sessionsFile), "sessions")
    : [];
  const processes = options.processesFile
    ? await readArrayFile<OpenClawProcessListEntry>(await resolveCapturePath(options.workspaceRoot, options.processesFile), "processes")
    : [];

  return buildOpenClawSnapshotFromToolData({
    generatedAt: options.generatedAt,
    includeMainSessions: options.includeMainSessions,
    processes,
    sessions,
    workspaceRoot: options.workspaceRoot,
  });
}

function parseCombinedOpenClawSource(
  raw: unknown,
  options: CaptureOpenClawTelemetryOptions
): OpenClawMonitorSnapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("OpenClaw source must be a JSON object.");
  }

  const source = raw as Partial<BuildOpenClawSnapshotFromToolDataInput & OpenClawMonitorSnapshot>;
  if (Array.isArray(source.sessions) && source.totals) {
    return {
      generatedAt: typeof source.generatedAt === "string" ? source.generatedAt : new Date().toISOString(),
      sessions: source.sessions as OpenClawWorkerSession[],
      totals: source.totals as OpenClawMonitorSnapshot["totals"],
      workspaceRoot: source.workspaceRoot ?? options.workspaceRoot,
    };
  }

  return buildOpenClawSnapshotFromToolData({
    generatedAt: source.generatedAt ?? options.generatedAt,
    includeMainSessions: options.includeMainSessions,
    processes: source.processes,
    sessions: source.sessions,
    workspaceRoot: source.workspaceRoot ?? options.workspaceRoot,
  });
}

async function readArrayFile<T>(filePath: string, label: string): Promise<T[]> {
  const raw = await readJson(filePath);
  if (Array.isArray(raw)) {
    return raw as T[];
  }

  if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>)[label])) {
    return (raw as Record<string, unknown>)[label] as T[];
  }

  throw new Error(`${filePath} must contain a JSON array or an object with a ${label} array.`);
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function resolveOpenClawCaptureSources(options: CaptureOpenClawTelemetryOptions): Promise<string[]> {
  return Promise.all(
    [options.sourceFile, options.sessionsFile, options.processesFile]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => resolveCapturePath(options.workspaceRoot, value))
  );
}

function resolveCapturePath(workspaceRoot: string, value: string): Promise<string> {
  return resolveWorkspacePath(workspaceRoot, value, "OpenClaw capture path");
}

async function writeSnapshotAtomically(outputPath: string, snapshot: OpenClawMonitorSnapshot): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(tempPath, outputPath);
}
