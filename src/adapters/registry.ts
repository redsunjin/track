import { readFile } from "node:fs/promises";
import path from "node:path";

import type { RoadmapAdapter } from "./base.js";
import { FileRoadmapAdapter } from "./file-adapter.js";
import { GitHubRoadmapAdapter } from "./github-adapter.js";
import { JiraRoadmapAdapter } from "./jira-adapter.js";
import { LinearRoadmapAdapter } from "./linear-adapter.js";
import { NotionRoadmapAdapter } from "./notion-adapter.js";

export type RoadmapAdapterKind = "file" | "notion" | "github" | "jira" | "linear";

const DEFAULT_ADAPTER_KIND: RoadmapAdapterKind = "file";

const ADAPTER_SOURCE_CANDIDATES: Record<RoadmapAdapterKind, string[]> = {
  file: ["track-plan.yaml", "track-plan.yml", "track-plan.json"],
  github: ["github-roadmap.json", "github-roadmap.yaml", "github-roadmap.yml"],
  jira: ["jira-roadmap.json", "jira-roadmap.yaml", "jira-roadmap.yml"],
  linear: ["linear-roadmap.json", "linear-roadmap.yaml", "linear-roadmap.yml"],
  notion: ["notion-roadmap.json", "notion-roadmap.yaml", "notion-roadmap.yml"],
};

export interface RoadmapAdapterFactoryOptions {
  cwd: string;
  adapterKind?: string;
  sourceFile?: string;
}

export function listRoadmapAdapterKinds(): RoadmapAdapterKind[] {
  return ["file", "notion", "github", "jira", "linear"];
}

export function normalizeRoadmapAdapterKind(raw: string | undefined): RoadmapAdapterKind {
  if (!raw) {
    return DEFAULT_ADAPTER_KIND;
  }

  if (raw === "file" || raw === "notion" || raw === "github" || raw === "jira" || raw === "linear") {
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
    case "github":
      return new GitHubRoadmapAdapter(sourcePath);
    case "jira":
      return new JiraRoadmapAdapter(sourcePath);
    case "linear":
      return new LinearRoadmapAdapter(sourcePath);
    case "notion":
      return new NotionRoadmapAdapter(sourcePath);
  }
}
