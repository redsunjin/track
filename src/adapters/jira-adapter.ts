import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import type { IntermediateRoadmapSchema } from "../adapter-schema.js";
import type { RoadmapAdapter } from "./base.js";
import { normalizeProviderFixtureSchema } from "./provider-fixture.js";

export class JiraRoadmapAdapter implements RoadmapAdapter {
  readonly sourceKind = "jira";
  private data?: IntermediateRoadmapSchema;

  constructor(private readonly filePath: string) {}

  async fetch(): Promise<void> {
    const absolutePath = path.resolve(this.filePath);
    const content = await readFile(absolutePath, "utf8");
    const parsed = absolutePath.endsWith(".json") ? JSON.parse(content) : parse(content);
    this.data = normalizeProviderFixtureSchema(parsed, {
      sourceKind: "jira",
      sourceRecordKey: "jira",
      phaseCollectionKey: "epics",
      taskCollectionKey: "issues",
      taskIdKeys: ["key", "id"],
      taskPhaseLinkKeys: ["epic_id"],
      taskOwnerKeys: ["assignee", "owner"],
      metadataName: (sourceRecord) => {
        const projectKey = sourceRecord.project_key;
        return typeof projectKey === "string" ? projectKey : undefined;
      },
      metadataExtra: (sourceRecord) => ({
        site: typeof sourceRecord.site === "string" ? sourceRecord.site : undefined,
        project_key: typeof sourceRecord.project_key === "string" ? sourceRecord.project_key : undefined,
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
