import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import { resolveTrackFilePath } from "./security.js";
import type { TrackRoadmapFile } from "./types.js";

const DEFAULT_ROADMAP_CANDIDATES = [
  path.join(".track", "roadmap.yaml"),
  path.join(".track", "roadmap.yml"),
  path.join(".track", "roadmap.json"),
];

export async function resolveRoadmapPath(cwd: string, explicitFile?: string): Promise<string> {
  if (explicitFile) {
    return resolveTrackFilePath(cwd, explicitFile, "Track roadmap file");
  }

  for (const candidate of DEFAULT_ROADMAP_CANDIDATES) {
    const fullPath = path.resolve(cwd, candidate);
    try {
      await readFile(fullPath, "utf8");
      return fullPath;
    } catch {
      continue;
    }
  }

  throw new Error(
    `No Track roadmap file found. Expected one of: ${DEFAULT_ROADMAP_CANDIDATES.join(", ")}`
  );
}

export async function loadTrackRoadmap(cwd: string, explicitFile?: string): Promise<TrackRoadmapFile> {
  const filePath = await resolveRoadmapPath(cwd, explicitFile);
  const raw = await readFile(filePath, "utf8");
  const parsed = filePath.endsWith(".json") ? JSON.parse(raw) : parse(raw);

  validateTrackRoadmap(parsed);
  return parsed;
}

export async function saveTrackRoadmap(filePath: string, roadmap: TrackRoadmapFile): Promise<void> {
  const payload = filePath.endsWith(".json") ? `${JSON.stringify(roadmap, null, 2)}\n` : stringify(roadmap);
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

function validateTrackRoadmap(value: unknown): asserts value is TrackRoadmapFile {
  if (!value || typeof value !== "object") {
    throw new Error("Track roadmap must be an object.");
  }

  const roadmap = value as Partial<TrackRoadmapFile>;
  if (typeof roadmap.version !== "number") {
    throw new Error("Track roadmap is missing numeric `version`.");
  }

  if (!roadmap.project?.id || !roadmap.project?.name) {
    throw new Error("Track roadmap is missing `project.id` or `project.name`.");
  }

  if (!Array.isArray(roadmap.roadmap?.phases)) {
    throw new Error("Track roadmap is missing `roadmap.phases`.");
  }
}
