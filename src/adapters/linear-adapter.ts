import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import type { IntermediateRoadmapSchema } from "../adapter-schema.js";
import type { RoadmapAdapter } from "./base.js";
import { normalizeProviderFixtureSchema } from "./provider-fixture.js";

export class LinearRoadmapAdapter implements RoadmapAdapter {
  readonly sourceKind = "linear";
  private data?: IntermediateRoadmapSchema;

  constructor(private readonly filePath: string) {}

  async fetch(): Promise<void> {
    const absolutePath = path.resolve(this.filePath);
    const content = await readFile(absolutePath, "utf8");
    const parsed = absolutePath.endsWith(".json") ? JSON.parse(content) : parse(content);
    this.data = normalizeProviderFixtureSchema(parsed, {
      sourceKind: "linear",
      sourceRecordKey: "linear",
      phaseCollectionKey: "cycles",
      taskCollectionKey: "issues",
      taskIdKeys: ["id"],
      taskPhaseLinkKeys: ["cycle_id"],
      taskOwnerKeys: ["assignee", "owner"],
      metadataName: (sourceRecord) => {
        const team = sourceRecord.team;
        return typeof team === "string" ? team : undefined;
      },
      metadataExtra: (sourceRecord) => ({
        workspace: typeof sourceRecord.workspace === "string" ? sourceRecord.workspace : undefined,
        team: typeof sourceRecord.team === "string" ? sourceRecord.team : undefined,
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
