import { appendFile, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import { resolveTrackFilePath } from "./security.js";
import type { TrackEvent, TrackStateFile } from "./types.js";

const DEFAULT_STATE_CANDIDATES = [
  path.join(".track", "state.yaml"),
  path.join(".track", "state.yml"),
  path.join(".track", "state.json"),
];
const LOCK_RETRY_MS = 50;
const LOCK_TIMEOUT_MS = 5_000;

export async function resolveStatePath(cwd: string, explicitFile?: string): Promise<string> {
  if (explicitFile) {
    return resolveTrackFilePath(cwd, explicitFile, "Track state file");
  }

  for (const candidate of DEFAULT_STATE_CANDIDATES) {
    const fullPath = path.resolve(cwd, candidate);
    try {
      await readFile(fullPath, "utf8");
      return fullPath;
    } catch {
      continue;
    }
  }

  throw new Error(
    `No Track state file found. Expected one of: ${DEFAULT_STATE_CANDIDATES.join(", ")}`
  );
}

export async function loadTrackState(cwd: string, explicitFile?: string): Promise<TrackStateFile> {
  const filePath = await resolveStatePath(cwd, explicitFile);
  return loadTrackStateFromPath(filePath);
}

export async function loadTrackStateFromPath(filePath: string): Promise<TrackStateFile> {
  const raw = await readFile(filePath, "utf8");
  const parsed = filePath.endsWith(".json") ? JSON.parse(raw) : parse(raw);

  validateTrackState(parsed);
  return parsed;
}

export async function saveTrackState(filePath: string, state: TrackStateFile): Promise<void> {
  const payload = filePath.endsWith(".json") ? `${JSON.stringify(state, null, 2)}\n` : stringify(state);
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}.tmp`
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await writeFile(tempPath, payload, "utf8");
    await rename(tempPath, filePath);
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function appendTrackEventLog(stateFilePath: string, event: TrackEvent): Promise<void> {
  const eventLogPath = resolveEventLogPath(stateFilePath);
  await mkdir(path.dirname(eventLogPath), { recursive: true });
  await appendFile(eventLogPath, `${JSON.stringify(event)}\n`, "utf8");
}

export async function withTrackStateLock<T>(
  stateFilePath: string,
  callback: () => Promise<T>,
  options?: { retryMs?: number; timeoutMs?: number }
): Promise<T> {
  const lockPath = `${stateFilePath}.lock`;
  const retryMs = options?.retryMs ?? LOCK_RETRY_MS;
  const timeoutMs = options?.timeoutMs ?? LOCK_TIMEOUT_MS;
  const startedAt = Date.now();

  while (true) {
    let handle;
    try {
      await mkdir(path.dirname(lockPath), { recursive: true });
      handle = await open(lockPath, "wx");
      try {
        return await callback();
      } finally {
        await handle.close().catch(() => undefined);
        await rm(lockPath, { force: true }).catch(() => undefined);
      }
    } catch (error: unknown) {
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      if (code !== "EEXIST") {
        throw error;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(`Timed out waiting for Track state lock: ${path.basename(stateFilePath)}`);
      }
      await sleep(retryMs);
    }
  }
}

export function resolveEventLogPath(stateFilePath: string): string {
  return path.join(path.dirname(stateFilePath), "events.ndjson");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateTrackState(value: unknown): asserts value is TrackStateFile {
  if (!value || typeof value !== "object") {
    throw new Error("Track state must be an object.");
  }

  const state = value as Partial<TrackStateFile>;
  if (typeof state.version !== "number") {
    throw new Error("Track state is missing numeric `version`.");
  }

  if (!state.project?.id || !state.project?.name) {
    throw new Error("Track state is missing `project.id` or `project.name`.");
  }

  if (!state.track?.id || !state.track?.title) {
    throw new Error("Track state is missing `track.id` or `track.title`.");
  }
}
