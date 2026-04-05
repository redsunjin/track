import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import type { TrackEvent, TrackStateFile } from "./types.js";

const DEFAULT_STATE_CANDIDATES = [
  path.join(".track", "state.yaml"),
  path.join(".track", "state.yml"),
  path.join(".track", "state.json"),
];

export async function resolveStatePath(cwd: string, explicitFile?: string): Promise<string> {
  if (explicitFile) {
    return path.resolve(cwd, explicitFile);
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
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, payload, "utf8");
}

export async function appendTrackEventLog(stateFilePath: string, event: TrackEvent): Promise<void> {
  const eventLogPath = resolveEventLogPath(stateFilePath);
  await mkdir(path.dirname(eventLogPath), { recursive: true });
  await appendFile(eventLogPath, `${JSON.stringify(event)}\n`, "utf8");
}

export function resolveEventLogPath(stateFilePath: string): string {
  return path.join(path.dirname(stateFilePath), "events.ndjson");
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
