import { readFile } from "node:fs/promises";
import path from "node:path";

import type { RoadmapAdapter } from "./base.js";
import { FileRoadmapAdapter } from "./file-adapter.js";
import { NotionRoadmapAdapter } from "./notion-adapter.js";

export type RoadmapAdapterKind = "file" | "notion";

const DEFAULT_ADAPTER_KIND: RoadmapAdapterKind = "file";

const ADAPTER_SOURCE_CANDIDATES: Record<RoadmapAdapterKind, string[]> = {
  file: ["track-plan.yaml", "track-plan.yml", "track-plan.json"],
  notion: ["notion-roadmap.json", "notion-roadmap.yaml", "notion-roadmap.yml"],
};

export interface RoadmapAdapterFactoryOptions {
  cwd: string;
  adapterKind?: string;
  sourceFile?: string;
}

export function listRoadmapAdapterKinds(): RoadmapAdapterKind[] {
  return ["file", "notion"];
}

export function normalizeRoadmapAdapterKind(raw: string | undefined): RoadmapAdapterKind {
  if (!raw) {
    return DEFAULT_ADAPTER_KIND;
  }

  if (raw === "file" || raw === "notion") {
    return raw;
  }

  throw new Error(
    `Unsupported roadmap adapter kind \`${raw}\`. Supported kinds: ${listRoadmapAdapterKinds().join(", ")}.`
  );
}

export async function resolveRoadmapAdapterSourcePath(
  cwd: string,
  adapterKind?: string,
  explicitFile?: string
): Promise<string> {
  const kind = normalizeRoadmapAdapterKind(adapterKind);
  if (explicitFile) {
    return path.resolve(cwd, explicitFile);
  }

  for (const candidate of ADAPTER_SOURCE_CANDIDATES[kind]) {
    const fullPath = path.resolve(cwd, candidate);
    try {
      await readFile(fullPath, "utf8");
      return fullPath;
    } catch {
      continue;
    }
  }

  throw new Error(
    `No ${kind} roadmap source file found. Expected one of: ${ADAPTER_SOURCE_CANDIDATES[kind].join(", ")}`
  );
}

export async function createRoadmapAdapter(options: RoadmapAdapterFactoryOptions): Promise<RoadmapAdapter> {
  const kind = normalizeRoadmapAdapterKind(options.adapterKind);
  const sourcePath = await resolveRoadmapAdapterSourcePath(options.cwd, kind, options.sourceFile);

  switch (kind) {
    case "file":
      return new FileRoadmapAdapter(sourcePath);
    case "notion":
      return new NotionRoadmapAdapter(sourcePath);
  }
}
