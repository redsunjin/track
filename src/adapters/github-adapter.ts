import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import type { IntermediateRoadmapSchema } from "../adapter-schema.js";
import type { RoadmapAdapter } from "./base.js";
import { normalizeProviderFixtureSchema } from "./provider-fixture.js";

export class GitHubRoadmapAdapter implements RoadmapAdapter {
  readonly sourceKind = "github";
  private data?: IntermediateRoadmapSchema;

  constructor(private readonly filePath: string) {}

  async fetch(): Promise<void> {
    const absolutePath = path.resolve(this.filePath);
    const content = await readFile(absolutePath, "utf8");
    const parsed = absolutePath.endsWith(".json") ? JSON.parse(content) : parse(content);
    this.data = normalizeProviderFixtureSchema(parsed, {
      sourceKind: "github",
      sourceRecordKey: "github",
      phaseCollectionKey: "milestones",
      taskCollectionKey: "issues",
      taskIdKeys: ["id"],
      taskPhaseLinkKeys: ["milestone_id"],
      taskOwnerKeys: ["assignee", "owner"],
      metadataName: (sourceRecord) => {
        const repository = sourceRecord.repository;
        return typeof repository === "string" ? repository : undefined;
      },
      metadataExtra: (sourceRecord) => ({
        repository: typeof sourceRecord.repository === "string" ? sourceRecord.repository : undefined,
        project_number:
          typeof sourceRecord.project_number === "number" ? sourceRecord.project_number : undefined,
      }),
    });
  }

  async toInternalSchema(): Promise<IntermediateRoadmapSchema> {
    if (!this.data) {
      throw new Error(`No data loaded from ${this.filePath}. Did you call fetch() first?`);
    }
    return this.data;
  }
}
